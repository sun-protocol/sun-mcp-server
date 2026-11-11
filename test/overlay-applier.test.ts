import { OverlayApplier } from '../src/overlay-applier'

describe('OverlayApplier parsing', () => {
  let applier: OverlayApplier

  beforeEach(() => {
    applier = new OverlayApplier()
  })

  it('parses JSON overlay objects from strings', () => {
    const overlay = applier.parseOverlay(
      '{"overlay":"1.0.0","info":{"title":"Test","version":"1"},"actions":[]}',
    )

    expect(overlay).toEqual({
      overlay: '1.0.0',
      info: { title: 'Test', version: '1' },
      actions: [],
    })
  })

  it('parses JSON arrays from strings in parseAny', () => {
    const result = applier.parseAny('[{"name":"alpha"},{"name":"beta"}]')

    expect(result).toEqual([{ name: 'alpha' }, { name: 'beta' }])
  })

  it('parses JSON objects with leading whitespace', () => {
    const result = applier.parseAny('\n  {"kind":"object","ok":true}')

    expect(result).toEqual({ kind: 'object', ok: true })
  })

  it('parses JSON arrays with leading whitespace', () => {
    const result = applier.parseAny('\n  [1,2,3]')

    expect(result).toEqual([1, 2, 3])
  })

  it.each(['base', 'overlay'])('rejects prototype poisoning in the %s before merging', (side) => {
    const base = JSON.parse('{"info":{"title":"base","__proto__":{"injected":true}}}')
    const update = JSON.parse('{"description":"changed","nested":{"__proto__":{"injected":true}}}')
    const overlay = {
      overlay: '1.0.0',
      info: { title: 'Test', version: '1' },
      actions: [
        { target: '$.info', update: side === 'overlay' ? update : { description: 'changed' } },
      ],
    }
    expect(() =>
      applier.apply(side === 'base' ? base : { info: { title: 'base' } }, overlay),
    ).toThrow(/unsafe|prototype/i)
    expect(Object.prototype).not.toHaveProperty('injected')
  })

  it('preserves nested object merging and array concatenation without mutating the input', () => {
    const base = { info: { title: 'base', nested: { keep: true }, tags: ['old'] } }
    const result = applier.apply(base, {
      overlay: '1.0.0',
      info: { title: 'Test', version: '1' },
      actions: [{ target: '$.info', update: { nested: { added: true }, tags: ['new'] } }],
    })
    expect(result).toEqual({
      info: { title: 'base', nested: { keep: true, added: true }, tags: ['old', 'new'] },
    })
    expect(base).toEqual({ info: { title: 'base', nested: { keep: true }, tags: ['old'] } })
  })

  it('rejects unsafe keys nested in YAML array values', () => {
    const overlay =
      'overlay: 1.0.0\ninfo: {title: Test, version: "1"}\nactions:\n  - target: $.info\n    update:\n      entries:\n        - __proto__: {injected: true}\n'
    expect(() => applier.apply('info: {title: base}', overlay)).toThrow(/unsafe|prototype/i)
  })

  it('handles shared and cyclic document references during input validation', () => {
    const target: { info: { title: string }; self?: unknown } = { info: { title: 'base' } }
    target.self = target
    const result = applier.apply(target, {
      overlay: '1.0.0',
      info: { title: 'Test', version: '1' },
      actions: [],
    }) as typeof target
    expect(result.self).toBe(result)
    expect(result.info.title).toBe('base')
  })
})
