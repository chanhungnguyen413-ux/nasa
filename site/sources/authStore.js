// Xác thực người dùng & đồng bộ dữ liệu riêng theo tài khoản (Firebase Auth + Firestore, kèm dự phòng SHA-256 trên máy).
import { MAP_TEXT } from '../i18n/mapText.js'
import { dsApplySnapshot, dsLoad, dsResetToDefault, dsSave, dsSnapshot } from './dataStore.js'

const AU_FB_CFG_KEY = 'mvm-fb-config'
const AU_ACCOUNTS_KEY = 'mvm-accounts-v1'
const AU_SESSION_KEY = 'mvm-session-v1'
const AU_USER_PREFIX = 'mvm-userdata:'
const AU_SDK_BASE = 'https://www.gstatic.com/firebasejs/11.0.2'

export const AU = {
  user: null, // { uid, email, displayName, provider: 'firebase' | 'local' }
  mode: 'login', // 'login' | 'signup'
  modalOpen: false,
  fbOpen: false,
  busy: false,
  error: null,
  info: null,
  fb: { configured: false, config: null, app: null, auth: null, db: null, sdk: null, ready: false },
}

const auT = () => MAP_TEXT[S.lang]?.auth ?? MAP_TEXT.vi.auth

export function auStorageKey() {
  return AU.user?.uid ? `${AU_USER_PREFIX}${AU.user.uid}` : 'mvm-data-v1'
}

function auReadJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function auWriteJson(key, value) {
  try {
    if (typeof localStorage === 'undefined') return false
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

async function auHashPassword(password, salt) {
  const text = `${salt}:${password}`
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Dự phòng khi trình duyệt không bật Web Crypto (http không phải localhost): băm đơn giản không lưu plain text
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `f-${(h >>> 0).toString(16)}`
}

function auRandomSalt() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint8Array(12)
    crypto.getRandomValues(a)
    return Array.from(a)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return Math.random().toString(36).slice(2)
}

let auSyncTimer = null
export function auSyncToCloud() {
  if (!AU.fb.ready || !AU.fb.db || !AU.fb.sdk || AU.user?.provider !== 'firebase' || !AU.user?.uid) return
  clearTimeout(auSyncTimer)
  auSyncTimer = setTimeout(async () => {
    try {
      const { doc, setDoc } = AU.fb.sdk.fs
      const ref = doc(AU.fb.db, 'users', AU.user.uid)
      await setDoc(ref, { ...dsSnapshot(), updatedAt: new Date().toISOString() })
    } catch {
      /* giữ bản lưu theo UID trên máy nếu mạng tạm gián đoạn */
    }
  }, 350)
}

async function auLoadFromCloud(uid) {
  if (!AU.fb.ready || !AU.fb.db || !AU.fb.sdk || !uid) return null
  try {
    const { doc, getDoc } = AU.fb.sdk.fs
    const snap = await getDoc(doc(AU.fb.db, 'users', uid))
    return snap.exists() ? snap.data() : null
  } catch {
    return null
  }
}

function auRefreshAppUI({ restoreGarden = false, resetMap = false } = {}) {
  if (typeof renderNav === 'function') renderNav()
  if (typeof MF !== 'undefined') {
    if (resetMap) {
      if (MF.marker) MF.marker.remove()
      MF.marker = null
      Object.assign(MF, { loc: null, record: null, elevation: null, origin: null, status: 'idle', error: null, cropQuery: null })
      if (typeof MFD !== 'undefined') {
        MFD.layers?.clearLayers()
        Object.assign(MFD, { mode: null, draft: [], note: null })
      }
      if (typeof MG !== 'undefined') {
        if (typeof mgCloseNameModal === 'function') mgCloseNameModal()
        MG.layer?.clearLayers()
        Object.assign(MG, { formOpen: false, notice: null, selector: null, modal: null })
      }
      if (typeof MD !== 'undefined') {
        MD.layer?.clearLayers()
        MD.previewLayer?.clearLayers()
        Object.assign(MD, { mode: 'idle', gardenId:null, draft: [], closed: false, rectStart: null, cursor: null, selectedIdx: null, error: null, info: null })
        MF.map?.getContainer()?.classList.remove('mw-crosshair')
        MF.map?.doubleClickZoom?.enable()
      }
      if (typeof MFZ !== 'undefined') {
        if (typeof mfzClearLayer === 'function') mfzClearLayer()
        MFZ.crop = null
        MFZ.focus = null
      }
      if (typeof CSM !== 'undefined' && typeof csmClearLayer === 'function') csmClearLayer()
      if (typeof MW !== 'undefined') {
        Object.assign(MW, { tab: 'field', evalResult: null, evalInputKey: null, stale: false, picking: false, confirmGeo: false })
      }
      MF.map?.setView([10.2, 105.75], 8)
    } else if (restoreGarden) {
      const active = DS.gardens.find((g) => g.id === DS.activeGardenId) ?? DS.gardens[0] ?? null
      if (active && typeof mgSelectGarden === 'function') {
        mgSelectGarden(active.id)
      } else if (DS.field && typeof mfSelect === 'function') {
        mfSelect({ lat: DS.field.lat, lon: DS.field.lon, id: DS.field.id ?? undefined, name: DS.field.name ?? undefined })
      } else if (typeof mgDrawAllGardens === 'function') {
        mgDrawAllGardens()
      }
    }
  }
  if (typeof mfRenderDistrictButtons === 'function') mfRenderDistrictButtons()
  if (typeof mwRenderBody === 'function') mwRenderBody()
  if (typeof mfRenderDynamic === 'function') mfRenderDynamic()
  if (typeof dhRenderAll === 'function') dhRenderAll()
  auRenderModal()
}

async function auActivateUser(user, { cloudData = undefined } = {}) {
  AU.user = user
  if (user.provider === 'local') auWriteJson(AU_SESSION_KEY, user)
  else auWriteJson(AU_SESSION_KEY, null)

  if (cloudData) {
    dsApplySnapshot(cloudData)
    auWriteJson(auStorageKey(), dsSnapshot())
  } else {
    dsLoad()
  }
  AU.modalOpen = false
  AU.error = null
  AU.info = null
  auRefreshAppUI({ restoreGarden: true })
}

async function auInitFirebase(config) {
  if (!config?.apiKey || !config?.projectId || !config?.appId) return false
  try {
    const [appMod, authMod, fsMod] = await Promise.all([
      import(`${AU_SDK_BASE}/firebase-app.js`),
      import(`${AU_SDK_BASE}/firebase-auth.js`),
      import(`${AU_SDK_BASE}/firebase-firestore.js`),
    ])
    const existing = appMod.getApps().find((a) => a.name === 'mekong-app')
    const app = existing ?? appMod.initializeApp(config, 'mekong-app')
    const auth = authMod.getAuth(app)
    const db = fsMod.getFirestore(app)
    AU.fb = { configured: true, config, app, auth, db, sdk: { auth: authMod, fs: fsMod }, ready: true }

    authMod.onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const cloud = await auLoadFromCloud(fbUser.uid)
        await auActivateUser(
          {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Farmer',
            provider: 'firebase',
          },
          { cloudData: cloud },
        )
      } else if (AU.user?.provider === 'firebase') {
        AU.user = null
        dsResetToDefault()
        auRefreshAppUI({ resetMap: true })
      }
    })
    return true
  } catch {
    AU.fb = { configured: Boolean(config), config, app: null, auth: null, db: null, sdk: null, ready: false }
    return false
  }
}

export async function auInit() {
  if (typeof window === 'undefined') return
  let cfg = auReadJson(AU_FB_CFG_KEY, null)
  if (!cfg && location.protocol.startsWith('http')) {
    try {
      const res = await fetch('/api/firebase-config')
      if (res.ok) {
        const j = await res.json()
        if (j?.configured && j.config) cfg = j.config
      }
    } catch {
      /* chạy tĩnh hoặc server không cấu hình Firebase */
    }
  }
  if (cfg) await auInitFirebase(cfg)
  if (!AU.fb.ready) {
    const sess = auReadJson(AU_SESSION_KEY, null)
    if (sess?.uid) {
      AU.user = sess
      dsLoad()
      auRefreshAppUI({ restoreGarden: true })
    }
  }
  if (typeof renderNav === 'function') renderNav()
}

export async function auRegister({ name, email, password }) {
  const T = auT()
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  const cleanName = String(name ?? '').trim() || cleanEmail.split('@')[0]
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return (AU.error = T.errInvalidEmail), auRenderModal()
  if (String(password ?? '').length < 6) return (AU.error = T.errShortPass), auRenderModal()

  AU.busy = true
  AU.error = null
  auRenderModal()
  try {
    if (AU.fb.ready && AU.fb.auth) {
      const { createUserWithEmailAndPassword, updateProfile } = AU.fb.sdk.auth
      const cred = await createUserWithEmailAndPassword(AU.fb.auth, cleanEmail, password)
      if (cleanName) await updateProfile(cred.user, { displayName: cleanName })
      const u = { uid: cred.user.uid, email: cleanEmail, displayName: cleanName, provider: 'firebase' }
      dsApplySnapshot(null)
      await auActivateUser(u)
      auSyncToCloud()
      return
    }
    const accounts = auReadJson(AU_ACCOUNTS_KEY, [])
    if (accounts.some((a) => a.email === cleanEmail)) {
      AU.error = T.errEmailExists
      return
    }
    const salt = auRandomSalt()
    const hash = await auHashPassword(password, salt)
    const uid = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    accounts.push({ uid, email: cleanEmail, displayName: cleanName, salt, hash })
    auWriteJson(AU_ACCOUNTS_KEY, accounts)
    dsApplySnapshot(null)
    await auActivateUser({ uid, email: cleanEmail, displayName: cleanName, provider: 'local' })
    dsSave()
  } catch (err) {
    AU.error = err?.code === 'auth/email-already-in-use' ? T.errEmailExists : err?.message || T.errAuthFailed
  } finally {
    AU.busy = false
    auRenderModal()
  }
}

export async function auLogin({ email, password }) {
  const T = auT()
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return (AU.error = T.errInvalidEmail), auRenderModal()
  if (!password) return (AU.error = T.errShortPass), auRenderModal()

  AU.busy = true
  AU.error = null
  auRenderModal()
  try {
    if (AU.fb.ready && AU.fb.auth) {
      const { signInWithEmailAndPassword } = AU.fb.sdk.auth
      const cred = await signInWithEmailAndPassword(AU.fb.auth, cleanEmail, password)
      const cloud = await auLoadFromCloud(cred.user.uid)
      await auActivateUser(
        {
          uid: cred.user.uid,
          email: cred.user.email || cleanEmail,
          displayName: cred.user.displayName || cleanEmail.split('@')[0],
          provider: 'firebase',
        },
        { cloudData: cloud },
      )
      return
    }
    const accounts = auReadJson(AU_ACCOUNTS_KEY, [])
    const acc = accounts.find((a) => a.email === cleanEmail)
    if (!acc) {
      AU.error = T.errAuthFailed
      return
    }
    const hash = await auHashPassword(password, acc.salt)
    if (hash !== acc.hash) {
      AU.error = T.errAuthFailed
      return
    }
    await auActivateUser({ uid: acc.uid, email: acc.email, displayName: acc.displayName, provider: 'local' })
  } catch {
    AU.error = T.errAuthFailed
  } finally {
    AU.busy = false
    auRenderModal()
  }
}

export async function auLogout() {
  if (AU.user) {
    dsSave()
    if (AU.fb.ready && AU.fb.auth && AU.user.provider === 'firebase') {
      try {
        await AU.fb.sdk.auth.signOut(AU.fb.auth)
      } catch {
        /* vẫn tiếp tục xóa phiên trên trình duyệt */
      }
    }
  }
  auWriteJson(AU_SESSION_KEY, null)
  AU.user = null
  AU.error = null
  AU.info = null
  dsResetToDefault()
  auRefreshAppUI({ resetMap: true })
}

export function auRenderModal() {
  if (typeof document === 'undefined') return
  let root = document.getElementById('au-modal-root')
  if (!AU.modalOpen) {
    if (root) root.innerHTML = ''
    return
  }
  if (!root) {
    root = document.createElement('div')
    root.id = 'au-modal-root'
    document.body.appendChild(root)
  }
  const T = auT()
  const isSignup = AU.mode === 'signup'
  const fbStatus = AU.fb.ready ? T.fbConnected : T.fbLocalFallback
  root.innerHTML = `
    <div class="scrim-in fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-moss-950/60 p-4" data-au="scrim">
      <div role="dialog" aria-modal="true" aria-labelledby="au-dialog-title" class="panel-in w-full max-w-md rounded-[28px] bg-white p-6 shadow-lift">
        <div class="flex items-center justify-between gap-3">
          <h2 id="au-dialog-title" class="text-xl font-extrabold text-ink">${isSignup ? T.titleSignup : T.titleLogin}</h2>
          <button type="button" data-au="close" aria-label="Close" class="rounded-full p-2 text-muted hover:bg-ground hover:text-ink">${icon('x', 'size-5')}</button>
        </div>
        <div class="mt-4 flex gap-1 rounded-full bg-ground p-1">
          <button type="button" data-au="mode" data-value="login" class="min-h-10 flex-1 rounded-full text-xs font-extrabold ${!isSignup ? 'bg-moss-900 text-white shadow-card' : 'text-muted hover:text-ink'}">${T.tabLogin}</button>
          <button type="button" data-au="mode" data-value="signup" class="min-h-10 flex-1 rounded-full text-xs font-extrabold ${isSignup ? 'bg-moss-900 text-white shadow-card' : 'text-muted hover:text-ink'}">${T.tabSignup}</button>
        </div>
        <form id="au-form" class="mt-4 space-y-3">
          ${
            isSignup
              ? `<div>
                  <label for="au-name" class="block text-xs font-bold text-ink">${T.nameLabel}</label>
                  <input id="au-name" name="name" type="text" required placeholder="${esc(T.namePh)}" class="mt-1 min-h-11 w-full rounded-xl border border-line bg-ground px-3.5 text-sm font-semibold text-ink outline-none focus:border-moss-900" />
                </div>`
              : ''
          }
          <div>
            <label for="au-email" class="block text-xs font-bold text-ink">${T.emailLabel}</label>
            <input id="au-email" name="email" type="email" required autocomplete="email" placeholder="${esc(T.emailPh)}" class="mt-1 min-h-11 w-full rounded-xl border border-line bg-ground px-3.5 text-sm font-semibold text-ink outline-none focus:border-moss-900" />
          </div>
          <div>
            <label for="au-pass" class="block text-xs font-bold text-ink">${T.passLabel}</label>
            <input id="au-pass" name="password" type="password" required minlength="6" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="${esc(T.passPh)}" class="mt-1 min-h-11 w-full rounded-xl border border-line bg-ground px-3.5 text-sm font-semibold text-ink outline-none focus:border-moss-900" />
          </div>
          ${AU.error ? `<p class="rounded-xl bg-clay-100 px-3 py-2 text-xs font-bold text-clay-700" role="alert">${esc(AU.error)}</p>` : ''}
          ${AU.info ? `<p class="rounded-xl bg-lime-100 px-3 py-2 text-xs font-bold text-moss-900">${esc(AU.info)}</p>` : ''}
          <button type="submit" ${AU.busy ? 'disabled' : ''} class="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-moss-900 px-5 text-sm font-extrabold text-white hover:bg-moss-800 disabled:opacity-60">${isSignup ? T.submitSignup : T.submitLogin}</button>
        </form>
        <p class="mt-3 text-[11px] leading-relaxed text-muted">${esc(fbStatus)}</p>
        <div class="mt-3 border-t border-line pt-3">
          <button type="button" data-au="toggleFb" class="text-xs font-bold text-moss-800 underline underline-offset-2">${T.fbCfgTitle}</button>
          ${
            AU.fbOpen
              ? `<form id="au-fb-form" class="mt-2 space-y-2">
                  <p class="text-[11px] text-muted">${esc(T.fbCfgHint)}</p>
                  <textarea name="fbjson" rows="4" placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}' class="w-full rounded-xl border border-line bg-ground p-2.5 font-mono text-[11px] text-ink outline-none focus:border-moss-900">${esc(AU.fb.config ? JSON.stringify(AU.fb.config, null, 2) : '')}</textarea>
                  <button type="submit" class="min-h-9 rounded-full border border-moss-900 px-3.5 text-xs font-bold text-moss-900 hover:bg-moss-50">${T.fbCfgSave}</button>
                </form>`
              : ''
          }
        </div>
      </div>
    </div>`
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-au="scrim"]')) {
      AU.modalOpen = false
      AU.error = null
      return auRenderModal()
    }
    const b = e.target.closest('[data-au]')
    if (!b) return
    switch (b.dataset.au) {
      case 'openModal':
        AU.modalOpen = true
        AU.error = null
        AU.info = null
        return auRenderModal()
      case 'close':
        AU.modalOpen = false
        AU.error = null
        return auRenderModal()
      case 'mode':
        AU.mode = b.dataset.value === 'signup' ? 'signup' : 'login'
        AU.error = null
        return auRenderModal()
      case 'toggleFb':
        AU.fbOpen = !AU.fbOpen
        return auRenderModal()
      case 'logout':
        return auLogout()
    }
  })

  document.addEventListener('submit', async (e) => {
    if (e.target.id === 'au-form') {
      e.preventDefault()
      const fd = new FormData(e.target)
      if (AU.mode === 'signup') {
        await auRegister({ name: fd.get('name'), email: fd.get('email'), password: fd.get('password') })
      } else {
        await auLogin({ email: fd.get('email'), password: fd.get('password') })
      }
    } else if (e.target.id === 'au-fb-form') {
      e.preventDefault()
      const fd = new FormData(e.target)
      try {
        const cfg = JSON.parse(String(fd.get('fbjson') ?? '').trim())
        if (!cfg?.apiKey || !cfg?.projectId || !cfg?.appId) throw new Error('invalid')
        auWriteJson(AU_FB_CFG_KEY, cfg)
        const ok = await auInitFirebase(cfg)
        AU.error = ok ? null : auT().errBadFbJson
        AU.info = ok ? auT().fbConnected : null
      } catch {
        AU.error = auT().errBadFbJson
      }
      auRenderModal()
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && AU.modalOpen) {
      AU.modalOpen = false
      AU.error = null
      auRenderModal()
    }
  })
}
