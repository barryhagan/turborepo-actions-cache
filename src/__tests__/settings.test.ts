import {expect, test, describe} from '@jest/globals'
import {cacheItemPrefix} from '../settings'

describe('settings tests', () => {
  test('default prefix', () => {
    expect(cacheItemPrefix).toEqual('turborepo_')
  })
})
