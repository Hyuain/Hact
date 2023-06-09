/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict'

let React
let ReactDOM
let ReactTestUtils

describe('ReactElement', () => {
  let ComponentFC

  beforeEach(() => {
    jest.resetModules()

    React = require('react')
    ReactDOM = require('react-dom')
    ReactTestUtils = require('react-dom/test-utils')
    // NOTE: We're explicitly not using JSX here. This is intended to test
    // classic JS without JSX.
    ComponentFC = () => {
      return React.createElement('div')
    }
  })

  it('returns a complete element according to spec', () => {
    const element = React.createElement(ComponentFC)
    expect(element.type).toBe(ComponentFC)
    expect(element.key).toBe(null)
    expect(element.ref).toBe(null)
    expect(element.props).toEqual({})
  })

  it('allows a string to be passed as the type', () => {
    const element = React.createElement('div')
    expect(element.type).toBe('div')
    expect(element.key).toBe(null)
    expect(element.ref).toBe(null)
    expect(element.props).toEqual({})
  })

  it('returns an immutable element', () => {
    const element = React.createElement(ComponentFC)
    expect(() => (element.type = 'div')).not.toThrow()
  })

  it('does not reuse the original config object', () => {
    const config = { foo: 1 }
    const element = React.createElement(ComponentFC, config)
    expect(element.props.foo).toBe(1)
    config.foo = 2
    expect(element.props.foo).toBe(1)
  })

  it('does not fail if config has no prototype', () => {
    const config = Object.create(null, { foo: { value: 1, enumerable: true } })
    const element = React.createElement(ComponentFC, config)
    expect(element.props.foo).toBe(1)
  })

  it('extracts key and ref from the config', () => {
    const element = React.createElement(ComponentFC, {
      key: '12',
      ref: '34',
      foo: '56'
    })
    expect(element.type).toBe(ComponentFC)
    expect(element.key).toBe('12')
    expect(element.ref).toBe('34')
    expect(element.props).toEqual({ foo: '56' })
  })

  it('extracts null key and ref', () => {
    const element = React.createElement(ComponentFC, {
      key: null,
      ref: null,
      foo: '12'
    })
    expect(element.type).toBe(ComponentFC)
    expect(element.key).toBe('null')
    expect(element.ref).toBe(null)
    expect(element.props).toEqual({ foo: '12' })
  })

  it('ignores undefined key and ref', () => {
    const props = {
      foo: '56',
      key: undefined,
      ref: undefined
    }
    const element = React.createElement(ComponentFC, props)
    expect(element.type).toBe(ComponentFC)
    expect(element.key).toBe(null)
    expect(element.ref).toBe(null)
    expect(element.props).toEqual({ foo: '56' })
  })

  it('ignores key and ref warning getters', () => {
    const elementA = React.createElement('div')
    const elementB = React.createElement('div', elementA.props)
    expect(elementB.key).toBe(null)
    expect(elementB.ref).toBe(null)
  })

  it('coerces the key to a string', () => {
    const element = React.createElement(ComponentFC, {
      key: 12,
      foo: '56'
    })
    expect(element.type).toBe(ComponentFC)
    expect(element.key).toBe('12')
    expect(element.ref).toBe(null)
    expect(element.props).toEqual({ foo: '56' })
  })

  it('merges an additional argument onto the children prop', () => {
    const a = 1
    const element = React.createElement(
      ComponentFC,
      {
        children: 'text'
      },
      a
    )
    expect(element.props.children).toBe(a)
  })

  it('does not override children if no rest args are provided', () => {
    const element = React.createElement(ComponentFC, {
      children: 'text'
    })
    expect(element.props.children).toBe('text')
  })

  it('overrides children if null is provided as an argument', () => {
    const element = React.createElement(
      ComponentFC,
      {
        children: 'text'
      },
      null
    )
    expect(element.props.children).toBe(null)
  })

  it('merges rest arguments onto the children prop in an array', () => {
    const a = 1
    const b = 2
    const c = 3
    const element = React.createElement(ComponentFC, null, a, b, c)
    expect(element.props.children).toEqual([1, 2, 3])
  })

  // NOTE: We're explicitly not using JSX here. This is intended to test
  // classic JS without JSX.
  it('allows static methods to be called using the type property', () => {
    function StaticMethodComponent() {
      return React.createElement('div')
    }
    StaticMethodComponent.someStaticMethod = () => 'someReturnValue'
    const element = React.createElement(StaticMethodComponent)
    expect(element.type.someStaticMethod()).toBe('someReturnValue')
  })

  // NOTE: We're explicitly not using JSX here. This is intended to test
  // classic JS without JSX.
  it('is indistinguishable from a plain object', () => {
    const element = React.createElement('div', { className: 'foo' })
    const object = {}
    expect(element.constructor).toBe(object.constructor)
  })

  it('does not warn for NaN props', () => {
    const Test = () => {
      return React.createElement('div')
    }
    const test = ReactTestUtils.renderIntoDocument(<Test value={+undefined} />)
    expect(test.props.value).toBeNaN()
  })
})
