import { describe, it, expect, beforeEach } from 'vitest'
import { getToken, setToken, clearToken } from '../tokenStorage'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('setToken', () => {
  it('stores in sessionStorage', () => {
    setToken('tok-abc')
    expect(sessionStorage.getItem('access_token')).toBe('tok-abc')
  })

  it('stores in localStorage for new-tab inheritance', () => {
    setToken('tok-abc')
    expect(localStorage.getItem('access_token')).toBe('tok-abc')
  })
})

describe('getToken', () => {
  it('returns the stored token', () => {
    setToken('tok-xyz')
    expect(getToken()).toBe('tok-xyz')
  })

  it('returns null when nothing is stored', () => {
    expect(getToken()).toBeNull()
  })
})

describe('clearToken', () => {
  it('removes token from both storages', () => {
    setToken('tok-del')
    clearToken()
    expect(getToken()).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})
