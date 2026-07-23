'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const repositoryRoot = path.resolve(__dirname, '..')
const openApiPath = path.join(repositoryRoot, 'specs/sunio-open-api.json')
const customToolsPath = path.join(repositoryRoot, 'src/tools/sunswap.ts')
const catalogPath = path.join(repositoryRoot, 'docs/sun-mcp-server/tool-catalog.json')
const englishApiPath = path.join(repositoryRoot, 'docs/sun-mcp-server/API.md')
const chineseApiPath = path.join(repositoryRoot, 'docs/sun-mcp-server/zh/API.md')
const checkOnly = process.argv.includes('--check')

function propertyName(node) {
  if (!node) return undefined
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text
  }
  return undefined
}

function objectProperty(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined
  return object.properties.find(
    (property) => ts.isPropertyAssignment(property) && propertyName(property.name) === name,
  )
}

function literalValue(node) {
  if (!node) return undefined
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isNumericLiteral(node)) return Number(node.text)
  return undefined
}

function findDescribeText(node) {
  let current = node
  while (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    if (current.expression.name.text === 'describe') {
      const value = literalValue(current.arguments[0])
      if (typeof value === 'string') return value
    }
    current = current.expression.expression
  }
  return ''
}

function hasTopLevelChainCall(node, method) {
  let current = node
  while (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    if (current.expression.name.text === method) return true
    current = current.expression.expression
  }
  return false
}

function readAnnotations(definition) {
  const property = objectProperty(definition, 'annotations')
  const annotations = property && ts.isPropertyAssignment(property) ? property.initializer : undefined

  function flag(name, fallback) {
    const entry = objectProperty(annotations, name)
    if (!entry || !ts.isPropertyAssignment(entry)) return fallback
    const value = literalValue(entry.initializer)
    return typeof value === 'boolean' ? value : fallback
  }

  return {
    readOnlyHint: flag('readOnlyHint', false),
    destructiveHint: flag('destructiveHint', false),
    idempotentHint: flag('idempotentHint', false),
    openWorldHint: flag('openWorldHint', false),
  }
}

function parseCustomTools() {
  const source = fs.readFileSync(customToolsPath, 'utf8')
  const sourceFile = ts.createSourceFile(
    customToolsPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const tools = []

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'registerTool' &&
      node.arguments.length >= 2
    ) {
      const name = literalValue(node.arguments[0])
      const definition = node.arguments[1]
      if (typeof name === 'string' && name.startsWith('sunswap_')) {
        assert(ts.isObjectLiteralExpression(definition), `${name}: tool definition must be an object`)
        const descriptionProperty = objectProperty(definition, 'description')
        const schemaProperty = objectProperty(definition, 'inputSchema')
        assert(
          descriptionProperty && ts.isPropertyAssignment(descriptionProperty),
          `${name}: missing description`,
        )
        assert(schemaProperty && ts.isPropertyAssignment(schemaProperty), `${name}: missing inputSchema`)
        assert(
          ts.isObjectLiteralExpression(schemaProperty.initializer),
          `${name}: inputSchema must be an object`,
        )

        const parameters = schemaProperty.initializer.properties.map((parameter) => {
          assert(ts.isPropertyAssignment(parameter), `${name}: unsupported schema property`)
          const parameterName = propertyName(parameter.name)
          assert(parameterName, `${name}: schema parameter must have a static name`)
          return {
            name: parameterName,
            required: !hasTopLevelChainCall(parameter.initializer, 'optional'),
            description: findDescribeText(parameter.initializer),
          }
        })

        tools.push({
          name,
          description: literalValue(descriptionProperty.initializer) || '',
          parameters,
          annotations: readAnnotations(definition),
          source: 'src/tools/sunswap.ts',
        })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  assert.equal(tools.length, 18, 'expected exactly 18 custom SUNSWAP tools')
  assert.equal(new Set(tools.map((tool) => tool.name)).size, tools.length, 'duplicate custom tool')
  return tools
}

function resolveOpenApiReference(specification, value) {
  if (!value || typeof value !== 'object' || !value.$ref) return value
  assert(value.$ref.startsWith('#/'), `unsupported external OpenAPI reference: ${value.$ref}`)
  return value.$ref
    .slice(2)
    .split('/')
    .reduce((current, segment) => current[segment.replace(/~1/g, '/').replace(/~0/g, '~')], specification)
}

function parseOpenApiTools() {
  const specification = JSON.parse(fs.readFileSync(openApiPath, 'utf8'))
  const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'])
  const tools = []

  for (const [endpoint, rawPathItem] of Object.entries(specification.paths || {})) {
    const pathItem = resolveOpenApiReference(specification, rawPathItem)
    for (const [method, rawOperation] of Object.entries(pathItem)) {
      if (!methods.has(method.toLowerCase())) continue
      const operation = resolveOpenApiReference(specification, rawOperation)
      if (!operation.operationId) continue
      const rawParameters = [...(pathItem.parameters || []), ...(operation.parameters || [])]
      const parameters = rawParameters.map((rawParameter) => {
        const parameter = resolveOpenApiReference(specification, rawParameter)
        const schema = resolveOpenApiReference(specification, parameter.schema || {})
        const defaultValue = schema.default
        return {
          name: parameter.name,
          in: parameter.in,
          required: parameter.required === true,
          description: parameter.description || '',
          ...(defaultValue === undefined ? {} : { default: defaultValue }),
        }
      })

      tools.push({
        name: operation.operationId,
        method: method.toUpperCase(),
        path: endpoint,
        description: operation.summary || operation.description || '',
        parameters,
        annotations: {
          readOnlyHint: method.toLowerCase() === 'get',
          destructiveHint: !['get', 'head', 'options'].includes(method.toLowerCase()),
          idempotentHint: ['get', 'put', 'delete', 'head', 'options'].includes(method.toLowerCase()),
          openWorldHint: true,
        },
        source: 'specs/sunio-open-api.json',
      })
    }
  }

  assert.equal(tools.length, 23, 'expected exactly 23 OpenAPI tools')
  assert.equal(new Set(tools.map((tool) => tool.name)).size, tools.length, 'duplicate operationId')
  return tools
}

function escapeMarkdown(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim()
}

function riskLabel(annotations) {
  const labels = []
  labels.push(annotations.readOnlyHint ? 'read-only' : 'write')
  if (annotations.destructiveHint) labels.push('destructive')
  if (annotations.idempotentHint) labels.push('idempotent')
  if (annotations.openWorldHint) labels.push('open-world')
  return labels.join(', ')
}

function renderParameterTable(parameters, language, includeLocation) {
  if (parameters.length === 0) {
    return language === 'zh' ? '无参数。\n' : 'No parameters.\n'
  }
  const labels =
    language === 'zh'
      ? ['参数', ...(includeLocation ? ['位置'] : []), '必填', '说明 / 默认行为']
      : ['Parameter', ...(includeLocation ? ['Location'] : []), 'Required', 'Description / default behavior']
  const alignment = labels.map(() => '---')
  const rows = parameters.map((parameter) => {
    const description = parameter.description || (language === 'zh' ? '未声明' : 'Not declared')
    const defaultSuffix =
      Object.prototype.hasOwnProperty.call(parameter, 'default')
        ? `${description ? '; ' : ''}${language === 'zh' ? '默认值' : 'default'}: ${JSON.stringify(parameter.default)}`
        : ''
    return [
      `\`${escapeMarkdown(parameter.name)}\``,
      ...(includeLocation ? [escapeMarkdown(parameter.in)] : []),
      parameter.required ? (language === 'zh' ? '是' : 'yes') : language === 'zh' ? '否' : 'no',
      escapeMarkdown(`${description}${defaultSuffix}`),
    ]
  })

  return [
    `| ${labels.join(' | ')} |`,
    `| ${alignment.join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
  ].join('\n')
}

function renderApi(catalog, language) {
  const isChinese = language === 'zh'
  const lines = [
    isChinese ? '# API 参考' : '# API Reference',
    '',
    isChinese
      ? '> 此文件由 `npm run docs:tools` 从实际工具定义生成，请勿手工修改。'
      : '> Generated from the runtime tool definitions by `npm run docs:tools`; do not edit manually.',
    '',
    isChinese
      ? `目录包含 ${catalog.openapi.length} 个 OpenAPI 动态工具和 ${catalog.custom.length} 个 SUNSWAP 自定义工具。`
      : `This catalog contains ${catalog.openapi.length} OpenAPI-generated tools and ${catalog.custom.length} custom SUNSWAP tools.`,
    '',
    isChinese ? '## OpenAPI 自动生成工具' : '## OpenAPI-Generated Tools',
    '',
    isChinese
      ? '事实源：`specs/sunio-open-api.json`。风险标记直接由 HTTP 方法推导。'
      : 'Source of truth: `specs/sunio-open-api.json`. Risk annotations are derived from the HTTP method.',
    '',
  ]

  for (const tool of catalog.openapi) {
    lines.push(
      `### ${tool.name}`,
      '',
      tool.description || (isChinese ? '规范未提供说明。' : 'No description is declared in the specification.'),
      '',
      `- ${isChinese ? '端点' : 'Endpoint'}: \`${tool.method} ${tool.path}\``,
      `- ${isChinese ? '风险' : 'Risk'}: \`${riskLabel(tool.annotations)}\``,
      '',
      renderParameterTable(tool.parameters, language, true),
    )
  }

  lines.push(
    isChinese ? '## SUNSWAP 自定义工具' : '## Custom SUNSWAP Tools',
    '',
    isChinese
      ? '事实源：`src/tools/sunswap.ts`。参数说明、默认行为与 MCP annotations 直接从注册定义提取。'
      : 'Source of truth: `src/tools/sunswap.ts`. Parameter behavior, defaults, and MCP annotations are extracted directly from each registration.',
    '',
  )

  for (const tool of catalog.custom) {
    lines.push(
      `### ${tool.name}`,
      '',
      tool.description || (isChinese ? '工具未提供说明。' : 'No description is declared for this tool.'),
      '',
      `- ${isChinese ? '风险' : 'Risk'}: \`${riskLabel(tool.annotations)}\``,
      '',
      renderParameterTable(tool.parameters, language, false),
    )
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

function assertDocumentedSourcePathsExist() {
  const documentationFiles = [
    'README.md',
    ...fs
      .readdirSync(path.join(repositoryRoot, 'docs/sun-mcp-server'), { recursive: true })
      .filter((entry) => entry.endsWith('.md'))
      .map((entry) => path.join('docs/sun-mcp-server', entry)),
  ]

  const missing = []
  for (const documentationFile of documentationFiles) {
    const contents = fs.readFileSync(path.join(repositoryRoot, documentationFile), 'utf8')
    for (const match of contents.matchAll(/`(src\/[A-Za-z0-9_./-]+\.ts)`/g)) {
      if (!fs.existsSync(path.join(repositoryRoot, match[1]))) {
        missing.push(`${documentationFile}: ${match[1]}`)
      }
    }
  }
  assert.deepEqual(missing, [], `documentation references missing source paths:\n${missing.join('\n')}`)
}

function assertRootReadmeCatalog(catalog) {
  const readme = fs.readFileSync(path.join(repositoryRoot, 'README.md'), 'utf8')
  const missingTools = [...catalog.openapi, ...catalog.custom]
    .map((tool) => tool.name)
    .filter((name) => !readme.includes(`\`${name}\``))
  assert.deepEqual(missingTools, [], `README is missing tools: ${missingTools.join(', ')}`)
  assert(!readme.includes('getPairsFromEntity'), 'README contains obsolete getPairsFromEntity name')
  assert(
    !/slippage tolerance defaults to 95%/i.test(readme),
    'README confuses desired * 95% minimum amounts with 95% slippage',
  )
}

function writeOrCheck(file, expected) {
  if (checkOnly) {
    assert(fs.existsSync(file), `${path.relative(repositoryRoot, file)} is missing`)
    assert.equal(
      fs.readFileSync(file, 'utf8'),
      expected,
      `${path.relative(repositoryRoot, file)} is stale; run npm run docs:tools`,
    )
  } else {
    fs.writeFileSync(file, expected)
  }
}

const catalog = {
  generatedFrom: ['specs/sunio-open-api.json', 'src/tools/sunswap.ts'],
  openapi: parseOpenApiTools(),
  custom: parseCustomTools(),
}

assertRootReadmeCatalog(catalog)
assertDocumentedSourcePathsExist()
writeOrCheck(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
writeOrCheck(englishApiPath, renderApi(catalog, 'en'))
writeOrCheck(chineseApiPath, renderApi(catalog, 'zh'))

process.stdout.write(
  `${checkOnly ? 'Verified' : 'Generated'} ${catalog.openapi.length} OpenAPI and ${catalog.custom.length} custom tool definitions.\n`,
)
