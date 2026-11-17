/**
 * Permanent Single-Device Binding Utility
 * Generates and preserves a persistent cryptographic hardware/browser identifier.
 * Binds user accounts permanently to their first successful login device.
 */

const STORAGE_KEY = 'ward2_permanent_device_id'
const COOKIE_KEY = 'ward2_dev_id'

// Helper to get cookie
function getCookie(name) {
  try {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
  } catch {
    return null
  }
  return null
}

// Helper to set cookie (lasts 10 years)
function setCookie(name, value) {
  try {
    const d = new Date()
    d.setTime(d.getTime() + 10 * 365 * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Strict`
  } catch (e) {
    console.warn('Could not set device cookie:', e)
  }
}

/**
 * Retrieve or generate permanent unique device ID
 */
export function getDeviceId() {
  if (typeof window === 'undefined') return 'server'

  try {
    // 1. Try localStorage
    let id = localStorage.getItem(STORAGE_KEY)
    if (id && id.length >= 16) {
      setCookie(COOKIE_KEY, id)
      return id
    }

    // 2. Fallback to cookie if localStorage was cleared
    const cookieId = getCookie(COOKIE_KEY)
    if (cookieId && cookieId.length >= 16) {
      localStorage.setItem(STORAGE_KEY, cookieId)
      return cookieId
    }

    // 3. Generate new permanent cryptographic ID
    const randomBytes = crypto.randomUUID 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`
    
    id = `dev_${randomBytes.replace(/[^a-zA-Z0-9_-]/g, '')}`
    localStorage.setItem(STORAGE_KEY, id)
    setCookie(COOKIE_KEY, id)
    return id
  } catch (err) {
    console.warn('Device ID storage error:', err)
    return `dev_fallback_${Date.now()}`
  }
}

/**
 * Human-readable friendly device name for Admin identification
 * e.g. "Windows 11 · Chrome (Desktop)", "Android · Chrome PWA (Mobile)"
 */
export function getDeviceName() {
  if (typeof window === 'undefined') return 'Unknown Device'

  try {
    const ua = navigator.userAgent || ''
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

    let os = 'Unknown OS'
    if (/Windows/i.test(ua)) os = 'Windows'
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac'
    else if (/Android/i.test(ua)) os = 'Android'
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS (Apple)'
    else if (/Linux/i.test(ua)) os = 'Linux'

    let browser = 'Browser'
    if (/Edg\//i.test(ua)) browser = 'Edge'
    else if (/Chrome\//i.test(ua)) browser = 'Chrome'
    else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari'
    else if (/Firefox\//i.test(ua)) browser = 'Firefox'

    const mode = isStandalone ? 'App / PWA' : (isMobile ? 'Mobile' : 'Desktop')
    const resolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`

    return `${os} · ${browser} (${mode} · ${resolution})`
  } catch {
    return 'Web Device'
  }
}

/**
 * Get comprehensive device details for binding
 */
export function getDeviceInfo() {
  return {
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    timestamp: new Date().toISOString()
  }
}
