# Tool48 Account Popover Snippet

Reusable Tool48 Account login popover for static Tool48 tools such as Garapon, Seat Memo, Penlight List, and future tools.

It uses only:

```js
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

Do not put privileged Supabase keys or backend-only credentials in frontend code.

---

## 1. HTML

Place this near the top of `<body>`.

```html
<header class="account-topbar">
  <a class="account-brand" href="#top" aria-label="Tool48">
    <span class="account-brand-mark">T</span>
    <span>
      <strong data-i18n="appTitle">Tool48 Tool</strong>
      <em data-i18n="cloudSaveTitle">Tool48 Account / Cloud Save</em>
    </span>
  </a>

  <div class="account-topbar-actions">
    <button class="ghost-button account-toggle" id="accountToggleBtn" type="button" data-i18n="accountNavGuest">
      Account
    </button>
  </div>

  <div class="account-popover" id="accountPopover" hidden>
    <p class="memo-status" id="cloudStatus" data-i18n="cloudLocalOnly">
      Login is optional. The tool still works without an account.
    </p>

    <form id="cloudLoginForm" class="cloud-login-form">
      <input id="cloudNicknameInput" class="control-input cloud-email-input" type="text" autocomplete="nickname" data-i18n-placeholder="cloudNicknamePlaceholder" placeholder="nickname" />
      <input id="cloudEmailInput" class="control-input cloud-email-input" type="email" inputmode="email" autocomplete="email" data-i18n-placeholder="cloudEmailPlaceholder" placeholder="Tool48 Account email" />
      <input id="cloudPasswordInput" class="control-input cloud-email-input" type="password" autocomplete="current-password" minlength="6" data-i18n-placeholder="cloudPasswordPlaceholder" placeholder="6+ characters" />

      <button class="primary-button memo-button" type="submit" data-auth-action="signin" data-i18n="cloudSignIn">
        Sign in
      </button>
      <button class="secondary-button memo-button" type="submit" data-auth-action="signup" data-i18n="cloudCreateAccount">
        Create account
      </button>
    </form>

    <div id="cloudActions" class="cloud-actions" hidden>
      <span class="cloud-user-pill" id="cloudUserLabel"></span>
      <button class="ghost-button memo-button" id="cloudLogoutBtn" type="button" data-i18n="cloudSignOut">
        Sign out
      </button>
    </div>

    <p id="cloudMessage" class="memo-status"></p>
  </div>
</header>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

If the host tool already has a language selector, call:

```js
setTool48AccountLang(currentLang);
```

after changing language.

---

## 2. CSS

```css
.account-topbar {
  position: sticky;
  top: 12px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 9px 10px;
  border-radius: 22px;
  background: rgba(255,255,255,.58);
  border: 1px solid rgba(255,255,255,.72);
  box-shadow: 0 18px 52px rgba(31,41,55,.12), inset 0 1px 0 rgba(255,255,255,.78);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.account-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--ink, #1b2330);
  text-decoration: none;
}
.account-brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: #fff;
  font-weight: 900;
  background: linear-gradient(135deg, #ff007f, #ff8ec4);
}
.account-brand span:last-child { min-width: 0; }
.account-brand strong,
.account-brand em {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-brand strong {
  font-size: .92rem;
  line-height: 1.15;
}
.account-brand em {
  margin-top: 2px;
  color: var(--text-sec, #667085);
  font-size: .72rem;
  font-style: normal;
  font-weight: 800;
}
.account-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}
.account-toggle {
  max-width: 150px;
  min-height: 40px;
  border-radius: 999px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(360px, calc(100vw - 24px));
  padding: 14px;
  border-radius: 18px;
  background: rgba(255,255,255,.94);
  border: 1px solid rgba(255,255,255,.78);
  box-shadow: 0 20px 60px rgba(27,35,48,.18);
  display: grid;
  gap: 10px;
}
.account-popover[hidden],
.cloud-actions[hidden],
.cloud-login-form[hidden] {
  display: none !important;
}
.cloud-login-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  min-width: 0;
}
.cloud-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.cloud-user-pill {
  min-width: 0;
  max-width: 100%;
  padding: 8px 10px;
  border-radius: 999px;
  color: var(--ink, #1b2330);
  background: rgba(255,255,255,.76);
  font-size: .78rem;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 560px) {
  .account-topbar {
    top: 8px;
    gap: 8px;
    padding: 8px;
    border-radius: 18px;
  }
  .account-brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 13px;
  }
  .account-brand em { display: none; }
  .account-toggle {
    max-width: 116px;
    min-height: 38px;
    padding-inline: 12px;
  }
  .account-popover {
    right: 0;
    width: calc(100vw - 16px);
  }
}
```

---

## 3. JavaScript

```js
const TOOL48_SUPABASE_URL = 'https://jappifgnjssqxvjodgiv.supabase.co';
const TOOL48_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_oXfJyHkRtn1BHBw-9ictBQ__01qBCZg';

const TOOL48_ACCOUNT_I18N = {
  ja: {
    appTitle: 'Tool48 Tool',
    cloudSaveTitle: 'Tool48 Account / Cloud Save',
    accountNavGuest: 'アカウント',
    cloudLocalOnly: 'ログインは任意です。ログインしなくても通常利用できます。',
    cloudLoggedIn: 'ログイン中: {name}',
    cloudUnavailable: 'Cloud Save を読み込めませんでした。',
    cloudNicknamePlaceholder: 'nickname',
    cloudEmailPlaceholder: 'Tool48 Account のメール',
    cloudPasswordPlaceholder: '6文字以上のパスワード',
    cloudSignIn: 'ログイン',
    cloudCreateAccount: 'アカウント作成',
    cloudSignOut: 'ログアウト',
    cloudMissingEmailPassword: 'メールアドレスとパスワードを入力してください。',
    cloudMissingSignup: 'nickname、メールアドレス、パスワードを入力してください。',
    cloudSigningIn: 'ログイン中...',
    cloudSigningUp: 'アカウント作成中...',
    cloudSignedIn: 'ログインしました。',
    cloudSignupNeedsConfirm: 'アカウントを作成しました。メール確認後にログインしてください。',
    cloudLoggedOut: 'ログアウトしました。',
    cloudActionFailed: 'アカウント操作に失敗しました。'
  },
  zh: {
    appTitle: 'Tool48 Tool',
    cloudSaveTitle: 'Tool48 Account / Cloud Save',
    accountNavGuest: '帳戶',
    cloudLocalOnly: '登入是可選的；不登入也可以正常使用。',
    cloudLoggedIn: '已登入：{name}',
    cloudUnavailable: 'Cloud Save 未能載入。',
    cloudNicknamePlaceholder: 'nickname',
    cloudEmailPlaceholder: 'Tool48 Account 電郵',
    cloudPasswordPlaceholder: '6個字以上密碼',
    cloudSignIn: '登入',
    cloudCreateAccount: '建立帳戶',
    cloudSignOut: '登出',
    cloudMissingEmailPassword: '請輸入電郵和密碼。',
    cloudMissingSignup: '請輸入 nickname、電郵和密碼。',
    cloudSigningIn: '登入中...',
    cloudSigningUp: '建立帳戶中...',
    cloudSignedIn: '已登入。',
    cloudSignupNeedsConfirm: '帳戶已建立，請先確認電郵再登入。',
    cloudLoggedOut: '已登出。',
    cloudActionFailed: '帳戶操作失敗。'
  },
  'zh-Hans': {
    appTitle: 'Tool48 Tool',
    cloudSaveTitle: 'Tool48 Account / Cloud Save',
    accountNavGuest: '账户',
    cloudLocalOnly: '登录是可选的；不登录也可以正常使用。',
    cloudLoggedIn: '已登录：{name}',
    cloudUnavailable: 'Cloud Save 未能载入。',
    cloudNicknamePlaceholder: 'nickname',
    cloudEmailPlaceholder: 'Tool48 Account 邮箱',
    cloudPasswordPlaceholder: '6个字以上密码',
    cloudSignIn: '登录',
    cloudCreateAccount: '建立账户',
    cloudSignOut: '登出',
    cloudMissingEmailPassword: '请输入邮箱和密码。',
    cloudMissingSignup: '请输入 nickname、邮箱和密码。',
    cloudSigningIn: '登录中...',
    cloudSigningUp: '建立账户中...',
    cloudSignedIn: '已登录。',
    cloudSignupNeedsConfirm: '账户已建立，请先确认邮箱再登录。',
    cloudLoggedOut: '已登出。',
    cloudActionFailed: '账户操作失败。'
  },
  ko: {
    appTitle: 'Tool48 Tool',
    cloudSaveTitle: 'Tool48 Account / Cloud Save',
    accountNavGuest: '계정',
    cloudLocalOnly: '로그인은 선택 사항입니다. 로그인하지 않아도 사용할 수 있습니다.',
    cloudLoggedIn: '로그인 중: {name}',
    cloudUnavailable: 'Cloud Save를 불러오지 못했습니다.',
    cloudNicknamePlaceholder: 'nickname',
    cloudEmailPlaceholder: 'Tool48 Account 이메일',
    cloudPasswordPlaceholder: '6자 이상 비밀번호',
    cloudSignIn: '로그인',
    cloudCreateAccount: '계정 만들기',
    cloudSignOut: '로그아웃',
    cloudMissingEmailPassword: '이메일과 비밀번호를 입력해 주세요.',
    cloudMissingSignup: 'nickname, 이메일, 비밀번호를 입력해 주세요.',
    cloudSigningIn: '로그인 중...',
    cloudSigningUp: '계정 생성 중...',
    cloudSignedIn: '로그인했습니다.',
    cloudSignupNeedsConfirm: '계정을 만들었습니다. 이메일 확인 후 로그인해 주세요.',
    cloudLoggedOut: '로그아웃했습니다.',
    cloudActionFailed: '계정 작업에 실패했습니다.'
  },
  th: {
    appTitle: 'Tool48 Tool',
    cloudSaveTitle: 'Tool48 Account / Cloud Save',
    accountNavGuest: 'บัญชี',
    cloudLocalOnly: 'การเข้าสู่ระบบเป็นทางเลือก ใช้งานได้แม้ไม่มีบัญชี',
    cloudLoggedIn: 'เข้าสู่ระบบแล้ว: {name}',
    cloudUnavailable: 'โหลด Cloud Save ไม่ได้',
    cloudNicknamePlaceholder: 'nickname',
    cloudEmailPlaceholder: 'อีเมล Tool48 Account',
    cloudPasswordPlaceholder: 'รหัสผ่านอย่างน้อย 6 ตัว',
    cloudSignIn: 'เข้าสู่ระบบ',
    cloudCreateAccount: 'สร้างบัญชี',
    cloudSignOut: 'ออกจากระบบ',
    cloudMissingEmailPassword: 'กรุณาใส่อีเมลและรหัสผ่าน',
    cloudMissingSignup: 'กรุณาใส่ nickname อีเมล และรหัสผ่าน',
    cloudSigningIn: 'กำลังเข้าสู่ระบบ...',
    cloudSigningUp: 'กำลังสร้างบัญชี...',
    cloudSignedIn: 'เข้าสู่ระบบแล้ว',
    cloudSignupNeedsConfirm: 'สร้างบัญชีแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
    cloudLoggedOut: 'ออกจากระบบแล้ว',
    cloudActionFailed: 'ดำเนินการบัญชีไม่สำเร็จ'
  },
  id: {
    appTitle: 'Tool48 Tool',
    cloudSaveTitle: 'Tool48 Account / Cloud Save',
    accountNavGuest: 'Akun',
    cloudLocalOnly: 'Login bersifat opsional. Alat tetap bisa dipakai tanpa akun.',
    cloudLoggedIn: 'Masuk sebagai: {name}',
    cloudUnavailable: 'Cloud Save tidak dapat dimuat.',
    cloudNicknamePlaceholder: 'nickname',
    cloudEmailPlaceholder: 'Email Tool48 Account',
    cloudPasswordPlaceholder: 'Password 6+ karakter',
    cloudSignIn: 'Masuk',
    cloudCreateAccount: 'Buat akun',
    cloudSignOut: 'Keluar',
    cloudMissingEmailPassword: 'Masukkan email dan password.',
    cloudMissingSignup: 'Masukkan nickname, email, dan password.',
    cloudSigningIn: 'Masuk...',
    cloudSigningUp: 'Membuat akun...',
    cloudSignedIn: 'Sudah masuk.',
    cloudSignupNeedsConfirm: 'Akun dibuat. Konfirmasi email sebelum masuk.',
    cloudLoggedOut: 'Sudah keluar.',
    cloudActionFailed: 'Aksi akun gagal.'
  },
  en: {
    appTitle: 'Tool48 Tool',
    cloudSaveTitle: 'Tool48 Account / Cloud Save',
    accountNavGuest: 'Account',
    cloudLocalOnly: 'Login is optional. The tool still works without an account.',
    cloudLoggedIn: 'Signed in: {name}',
    cloudUnavailable: 'Cloud Save could not load.',
    cloudNicknamePlaceholder: 'nickname',
    cloudEmailPlaceholder: 'Tool48 Account email',
    cloudPasswordPlaceholder: '6+ characters',
    cloudSignIn: 'Sign in',
    cloudCreateAccount: 'Create account',
    cloudSignOut: 'Sign out',
    cloudMissingEmailPassword: 'Please enter email and password.',
    cloudMissingSignup: 'Please enter nickname, email, and password.',
    cloudSigningIn: 'Signing in...',
    cloudSigningUp: 'Creating account...',
    cloudSignedIn: 'Signed in.',
    cloudSignupNeedsConfirm: 'Account created. Please confirm your email before signing in.',
    cloudLoggedOut: 'Signed out.',
    cloudActionFailed: 'Account action failed.'
  }
};

const tool48Account = {
  client: null,
  user: null,
  busy: false,
  lang: document.documentElement.lang || localStorage.getItem('tool48_lang') || 'zh'
};

function tool48AccountText(key, replacements = {}) {
  const lang = TOOL48_ACCOUNT_I18N[tool48Account.lang] ? tool48Account.lang : 'en';
  const text = TOOL48_ACCOUNT_I18N[lang][key] || TOOL48_ACCOUNT_I18N.en[key] || key;
  return Object.entries(replacements).reduce((value, [name, replacement]) => {
    return value.split(`{${name}}`).join(replacement);
  }, text);
}

function setTool48AccountLang(lang) {
  tool48Account.lang = TOOL48_ACCOUNT_I18N[lang] ? lang : 'en';
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = tool48AccountText(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    node.placeholder = tool48AccountText(node.dataset.i18nPlaceholder);
  });
  renderTool48Account();
}

function getTool48DisplayName() {
  return tool48Account.user?.user_metadata?.display_name || tool48Account.user?.email || 'Tool48 Account';
}

function setTool48AccountMessage(message) {
  const node = document.getElementById('cloudMessage');
  if (node) node.textContent = message || '';
}

function setTool48AccountBusy(busy) {
  tool48Account.busy = busy;
  ['cloudNicknameInput', 'cloudEmailInput', 'cloudPasswordInput'].forEach(id => {
    const node = document.getElementById(id);
    if (node) node.disabled = busy;
  });
  document.querySelectorAll('#cloudLoginForm button, #cloudLogoutBtn').forEach(button => {
    button.disabled = busy;
  });
}

function renderTool48Account() {
  const loggedIn = Boolean(tool48Account.user);
  const form = document.getElementById('cloudLoginForm');
  const actions = document.getElementById('cloudActions');
  const userLabel = document.getElementById('cloudUserLabel');
  const toggle = document.getElementById('accountToggleBtn');
  const status = document.getElementById('cloudStatus');
  const displayName = getTool48DisplayName();

  if (form) form.hidden = loggedIn || !tool48Account.client;
  if (actions) actions.hidden = !loggedIn;
  if (userLabel) userLabel.textContent = loggedIn ? displayName : '';
  if (toggle) toggle.textContent = loggedIn ? displayName : tool48AccountText('accountNavGuest');
  if (status) {
    status.textContent = !tool48Account.client
      ? tool48AccountText('cloudUnavailable')
      : loggedIn
        ? tool48AccountText('cloudLoggedIn', { name: displayName })
        : tool48AccountText('cloudLocalOnly');
  }
}

async function initTool48Account() {
  setTool48AccountLang(tool48Account.lang);
  if (!window.supabase?.createClient) {
    renderTool48Account();
    return;
  }

  tool48Account.client = window.supabase.createClient(TOOL48_SUPABASE_URL, TOOL48_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const result = await tool48Account.client.auth.getSession();
  tool48Account.user = result.data.session?.user || null;

  tool48Account.client.auth.onAuthStateChange((_event, session) => {
    tool48Account.user = session?.user || null;
    renderTool48Account();
  });

  bindTool48AccountEvents();
  renderTool48Account();
}

function bindTool48AccountEvents() {
  const popover = document.getElementById('accountPopover');
  const toggle = document.getElementById('accountToggleBtn');

  toggle?.addEventListener('click', () => {
    if (popover) popover.hidden = !popover.hidden;
  });

  document.addEventListener('click', event => {
    if (!popover || popover.hidden) return;
    if (popover.contains(event.target) || toggle?.contains(event.target)) return;
    popover.hidden = true;
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && popover) popover.hidden = true;
  });

  document.getElementById('cloudLoginForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!tool48Account.client) {
      setTool48AccountMessage(tool48AccountText('cloudUnavailable'));
      return;
    }

    const action = event.submitter?.dataset.authAction === 'signup' ? 'signup' : 'signin';
    const nickname = document.getElementById('cloudNicknameInput')?.value.trim() || '';
    const email = document.getElementById('cloudEmailInput')?.value.trim() || '';
    const password = document.getElementById('cloudPasswordInput')?.value || '';

    if (!email || !password) {
      setTool48AccountMessage(tool48AccountText('cloudMissingEmailPassword'));
      return;
    }
    if (action === 'signup' && !nickname) {
      setTool48AccountMessage(tool48AccountText('cloudMissingSignup'));
      return;
    }

    setTool48AccountBusy(true);
    setTool48AccountMessage(tool48AccountText(action === 'signup' ? 'cloudSigningUp' : 'cloudSigningIn'));

    const result = action === 'signup'
      ? await tool48Account.client.auth.signUp({
          email,
          password,
          options: { data: { display_name: nickname }, emailRedirectTo: window.location.href }
        })
      : await tool48Account.client.auth.signInWithPassword({ email, password });

    setTool48AccountBusy(false);

    if (result.error) {
      setTool48AccountMessage(result.error.message || tool48AccountText('cloudActionFailed'));
      return;
    }

    tool48Account.user = result.data.session?.user || tool48Account.user;
    setTool48AccountMessage(
      tool48Account.user ? tool48AccountText('cloudSignedIn') : tool48AccountText('cloudSignupNeedsConfirm')
    );
    if (popover && tool48Account.user) popover.hidden = true;
    renderTool48Account();
  });

  document.getElementById('cloudLogoutBtn')?.addEventListener('click', async () => {
    if (!tool48Account.client) return;
    setTool48AccountBusy(true);
    await tool48Account.client.auth.signOut();
    setTool48AccountBusy(false);
    setTool48AccountMessage(tool48AccountText('cloudLoggedOut'));
  });
}

document.addEventListener('DOMContentLoaded', initTool48Account);
```

---

## 4. Host Tool Integration Notes

- Keep the tool usable without login.
- Login should only unlock optional cloud features.
- Use `tool48Account.user?.id` as the Supabase `user_id`.
- Use RLS policies so users can only edit their own private records.
- Public community stats should use separate consent fields such as `public_consent` and `public_status`.
- Call `setTool48AccountLang(lang)` when the host tool language changes.
- On mobile, keep the account button short and ellipsized so it does not overflow.
