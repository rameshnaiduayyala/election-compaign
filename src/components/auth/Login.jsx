
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  User, Lock, Eye, EyeOff, LogIn,
  AlertCircle, Loader2, ShieldCheck,
  ArrowRight, Fingerprint, ShieldAlert, Smartphone
} from 'lucide-react'
import { getDeviceId, getDeviceName } from '../../utils/deviceBinding'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deviceBlockedInfo, setDeviceBlockedInfo] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Please enter both your username and password.')
      return
    }

    setBusy(true)
    setError('')
    setDeviceBlockedInfo(null)

    try {
      const trimmed = username.trim()
      const currentDeviceId = getDeviceId()
      const currentDeviceName = getDeviceName()

      // 1. Check if user is super admin first or query user directly
      // Super Admin is completely exempt from device binding (can log in from any and every device without locking)
      const { data: user, error: queryError } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${trimmed},email.eq.${trimmed}`)
        .eq('password', password)
        .eq('is_active', true)
        .maybeSingle()

      if (queryError) {
        setError(`Database error: ${queryError.message}`)
        setBusy(false)
        return
      }

      if (!user) {
        setError('Invalid username or password. Please check your credentials.')
        setBusy(false)
        return
      }

      const normalizedRole = String(user.role || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
      const isSuperAdminUser = normalizedRole === 'superadmin'

      if (isSuperAdminUser) {
        // Super Admin logs in immediately on ANY device with ZERO bounding checks or restrictions
        onLogin({
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            ward_number: user.ward_number,
            phone: user.phone,
            bound_device_id: null,
            bound_device_name: 'Unrestricted (Super Admin)'
          }
        })
        return
      }

      // For standard users/admins/agents: Validate device binding
      if (!user.bound_device_id) {
        // First login on this account: Automatically bind this device
        try {
          await supabase.from('users').update({
            bound_device_id: currentDeviceId,
            bound_device_name: currentDeviceName,
            bound_device_at: new Date().toISOString()
          }).eq('id', user.id)
        } catch (e) {
          console.warn('Could not update bound_device_id:', e)
        }
      } else if (user.bound_device_id !== currentDeviceId) {
        // Block other devices
        setDeviceBlockedInfo({
          boundDeviceName: user.bound_device_name,
          boundDeviceAt: user.bound_device_at
        })
        setError(`Access Denied: This account is permanently registered to another device (${user.bound_device_name || 'Registered Device'}). Contact Super Admin to reset your device binding.`)
        setBusy(false)
        return
      }

      // Standard user login succeeded!
      onLogin({
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          ward_number: user.ward_number,
          phone: user.phone,
          bound_device_id: currentDeviceId,
          bound_device_name: currentDeviceName
        }
      })
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center
      md:justify-end md:pr-44 lg:pr-60 xl:pr-76
      p-4 sm:p-8 bg-cover bg-center bg-no-repeat
      relative overflow-hidden font-sans antialiased"
      style={{ backgroundImage: "url('/ajay-login-bg.png')" }}
    >
      {/* Subtle background overlay */}
      <div className="absolute inset-0 bg-gradient-to-r
        from-transparent via-transparent to-slate-950/10 pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[420px]
        bg-white/90 backdrop-blur-2xl
        rounded-[28px] p-7 sm:p-9
        border border-white/80
        shadow-[0_25px_80px_rgba(15,23,42,0.22)]
        animate-in fade-in slide-in-from-right-4 duration-500">


        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2
            px-3 py-1.5 rounded-full
            bg-blue-50 border border-blue-100
            text-blue-700 text-[10px] font-extrabold
            tracking-[0.15em] uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Ward 2 · Venkayammapeta
          </div>

          <h1 className="text-3xl font-black text-slate-900
            tracking-tight">
            Welcome Back
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Sign in to your Venkayammapeta portal
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-5">

          {/* Username */}
          <div>
            <label className="block text-xs font-bold
              text-slate-700 mb-2">
              Username or Email
            </label>

            <div className="relative">
              <User size={19}
                className="absolute left-4 top-1/2
                -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full h-13 py-3.5 pl-12 pr-4
                bg-slate-50 border border-slate-200
                rounded-xl text-sm text-slate-900
                placeholder:text-slate-400
                outline-none transition-all
                focus:bg-white focus:border-blue-500
                focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold
              text-slate-700 mb-2">
              Password
            </label>

            <div className="relative">
              <Lock size={19}
                className="absolute left-4 top-1/2
                -translate-y-1/2 text-slate-400" />

              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-13 py-3.5 pl-12 pr-12
                bg-slate-50 border border-slate-200
                rounded-xl text-sm text-slate-900
                placeholder:text-slate-400
                outline-none transition-all
                focus:bg-white focus:border-blue-500
                focus:ring-4 focus:ring-blue-500/10"
              />

              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-4 top-1/2
                -translate-y-1/2 text-slate-400
                hover:text-blue-600 transition"
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword
                  ? <EyeOff size={19} />
                  : <Eye size={19} />}
              </button>
            </div>
          </div>

          {/* Device Binding Blocked Alert */}
          {deviceBlockedInfo && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-xs space-y-2 text-left animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-red-700 text-sm">
                <ShieldAlert size={18} className="shrink-0 text-red-600" />
                <span>Device Binding Protection</span>
              </div>
              <p className="text-slate-700 leading-snug m-0">
                This account is permanently bound to another registered device:
              </p>
              <div className="p-2.5 bg-white border border-red-200 rounded-xl font-mono text-[11px] text-red-900 font-bold flex items-center gap-2 shadow-2xs">
                <Smartphone size={15} className="shrink-0 text-red-600" />
                <span className="truncate">{deviceBlockedInfo.boundDeviceName || 'Registered Device'}</span>
              </div>
              <p className="text-slate-500 text-[10px] leading-tight m-0">
                🔒 Credentials cannot be used on multiple devices. All other devices remain blocked even when the original device is logged out. Please contact Ramesh(7989419864) to reset your device.
              </p>
            </div>
          )}

          {/* Error */}
          {error && !deviceBlockedInfo && (
            <div className="p-3.5 bg-red-50 border border-red-200
              rounded-xl text-red-600 text-xs
              flex items-start gap-2">
              <AlertCircle size={17} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-13 mt-2 px-5
            bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600
            hover:from-blue-800 hover:via-blue-700 hover:to-indigo-700
            text-white font-bold text-sm rounded-xl
            shadow-lg shadow-blue-600/25
            hover:shadow-xl hover:shadow-blue-600/30
            active:scale-[0.98]
            transition-all duration-200
            flex items-center justify-center gap-2
            disabled:opacity-60 disabled:cursor-not-allowed">

            {busy ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                Verifying credentials...
              </>
            ) : (
              <>
                <LogIn size={19} />
                Sign In to Portal
                <ArrowRight size={17} className="ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-7 pt-5 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2
            text-slate-500">
            <Fingerprint size={17} className="text-blue-600" />
            <span className="text-[11px] font-semibold">
              Secure Access · Authorized Personnel Only
            </span>
          </div>
          <div className="text-center text-[10px] text-slate-400 mt-2 font-medium">
            Developed by <span className="font-bold text-slate-600">Ramesh Ayyala</span>
          </div>
        </div>
      </div>
    </div>
  )
}
