// ============================================================
// 🎓 ديف أكاديمي - الملف الكامل والمحمي v5.0
// ============================================================
// هذا الملف يحتوي على جميع دوال ومكونات المنصة
// تم تطويره وفق أعلى معايير الأمان والجودة
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // 1) التهيئة - SUPABASE CONFIG
    // ============================================================
    // هذه المعلومات تستخدم للاتصال بقاعدة البيانات
    // لا تشاركها مع أي شخص غير موثوق
    // ============================================================

    const SUPABASE_URL = 'https://mgcljgrkxhyjjmxqjkti.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_TE4fMQARKZb0XcjhAnEJhA_ws6AUxoi';
    
    let supabaseClient = null;
    if (window.supabase) {
        if (!window._supabaseClient) {
            window._supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        supabaseClient = window._supabaseClient;
    }

    // ============================================================
    // 2) STATE MANAGEMENT - الحالة العامة للتطبيق
    // ============================================================
    // هنا نخزن جميع بيانات التطبيق في مكان واحد
    // لتسهيل الوصول والتعديل
    // ============================================================

    const state = {
        user: null,                // بيانات المستخدم الحالي
        isAdmin: false,            // هل المستخدم مشرف؟
        isTeacher: false,          // هل المستخدم مدرس؟
        currentFilter: 'all',      // الفلتر الحالي للصفوف
        grades: [],                // قائمة الصفوف الدراسية
        teachers: [],              // قائمة المدرسين
        classes: [],               // قائمة الفصول
        myClasses: [],             // فصول الطالب المسجل فيها
        searchTerm: '',            // مصطلح البحث
        currentPage: 'teachers',   // الصفحة الحالية
        loading: false,            // حالة التحميل
        inactivityTimer: null,     // مؤقت الخمول
        searchTimeout: null,       // مؤقت البحث
        codeAttempts: {},          // محاولات إدخال الكود
        theme: 'light',            // الوضع الحالي (فاتح/مظلم)
        isGuest: false,            // هل المستخدم ضيف؟
        connectionStatus: true,    // حالة الاتصال
        lastActivity: Date.now(),  // آخر نشاط للمستخدم
        notifications: [],         // الإشعارات
        unreadCount: 0,            // عدد الإشعارات غير المقروءة
        pagination: {              // إعدادات التصفح
            currentPage: 1,
            pageSize: 20,
            totalItems: 0
        }
    };

    // ============================================================
    // 3) SECURITY - نظام الأمان والحماية المتكامل
    // ============================================================
    // هذا القسم يحتوي على جميع دوال الحماية
    // لمنع الهجمات الشائعة مثل XSS و CSRF
    // ============================================================

    const Security = {
        // ============================================================
        // حماية أدوات المطور ومنع الاختراق
        // ============================================================
        protectDevTools() {
            // منع فتح أدوات المطور
            document.addEventListener('keydown', function(e) {
                // منع F12 واختصارات أدوات المطور
                if (e.key === 'F12' ||
                    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
                    (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
                    (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
                    (e.ctrlKey && (e.key === 'S' || e.key === 's')) ||
                    (e.ctrlKey && (e.key === 'C' || e.key === 'c')) ||
                    (e.ctrlKey && (e.key === 'V' || e.key === 'v'))) {
                    e.preventDefault();
                    Toast.warning('⚠️ هذه الميزة غير متاحة في هذه المنصة');
                    return false;
                }
            });

            // منع القائمة المنبثقة بزر الماوس الأيمن
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                Toast.warning('⚠️ هذه الميزة غير متاحة');
                return false;
            });

            // منع تحديد النصوص (لحماية المحتوى من النسخ)
            document.addEventListener('selectstart', function(e) {
                // السماح بتحديد النص في حقول الإدخال فقط
                if (e.target.tagName !== 'INPUT' && 
                    e.target.tagName !== 'TEXTAREA' && 
                    e.target.tagName !== 'SELECT') {
                    e.preventDefault();
                }
            });

            // منع النسخ من الصفحة
            document.addEventListener('copy', function(e) {
                // السماح بالنسخ من حقول الإدخال فقط
                if (e.target.tagName !== 'INPUT' && 
                    e.target.tagName !== 'TEXTAREA' && 
                    e.target.tagName !== 'SELECT') {
                    e.preventDefault();
                    Toast.warning('⚠️ لا يسمح بنسخ المحتوى');
                    return false;
                }
            });

            // منع لصق المحتوى في حقول غير مسموحة
            document.addEventListener('paste', function(e) {
                // منع اللصق في جميع الحقول باستثناء حقول النصوص
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    // السماح باللصق في حقول الإدخال
                    return true;
                }
                e.preventDefault();
                Toast.warning('⚠️ لا يسمح بلصق المحتوى هنا');
                return false;
            });

            // منع السحب والإفلات
            document.addEventListener('dragstart', function(e) {
                e.preventDefault();
                return false;
            });

            // منع حفظ الصفحة
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
                    e.preventDefault();
                    Toast.warning('⚠️ هذه الميزة غير متاحة');
                    return false;
                }
            });

            // حماية من حقن iframe (Clickjacking)
            if (window.top !== window.self) {
                window.top.location = window.self.location;
            }

            // منع فتح وحدة التحكم
            console.log = function() {};
            console.warn = function() {};
            console.error = function() {};
            
            // لكن نحتفظ بالسجلات الهامة
            console._log = console.log;
            console._warn = console.warn;
            console._error = console.error;
            
            // إعادة تعريف console.log بشكل آمن
            console.log = function(message) {
                if (typeof message === 'string' && message.includes('🔒')) {
                    console._log(message);
                }
            };
        },

        // ============================================================
        // حماية XSS (Cross-Site Scripting)
        // ============================================================
        protectXSS() {
            // تنظيف المدخلات من الأكواد الضارة
            const sanitizeInput = (input) => {
                if (typeof input !== 'string') return input;
                
                // إزالة HTML tags
                let sanitized = input.replace(/<[^>]*>/g, '');
                
                // إزالة javascript:
                sanitized = sanitized.replace(/javascript:/gi, '');
                
                // إزالة event handlers
                sanitized = sanitized.replace(/on\w+=/gi, '');
                
                // إزالة eval
                sanitized = sanitized.replace(/eval\(/gi, '');
                
                // إزالة document.cookie
                sanitized = sanitized.replace(/document\.cookie/gi, '');
                
                return sanitized;
            };

            // تطبيق التنظيف على جميع المدخلات
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(el => {
                // تنظيف عند الإدخال
                el.addEventListener('input', function() {
                    if (this.type !== 'password' && this.type !== 'email') {
                        const cursorPosition = this.selectionStart;
                        this.value = sanitizeInput(this.value);
                        this.setSelectionRange(cursorPosition, cursorPosition);
                    }
                });

                // تنظيف عند اللصق
                el.addEventListener('paste', function(e) {
                    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                    if (pastedText) {
                        const sanitized = sanitizeInput(pastedText);
                        if (pastedText !== sanitized) {
                            e.preventDefault();
                            const selection = window.getSelection();
                            if (selection && selection.rangeCount) {
                                const range = selection.getRangeAt(0);
                                range.deleteContents();
                                range.insertNode(document.createTextNode(sanitized));
                            } else {
                                this.value = this.value.substring(0, this.selectionStart) + 
                                            sanitized + 
                                            this.value.substring(this.selectionEnd);
                            }
                        }
                    }
                });
            });

            // حماية من href="javascript:"
            document.querySelectorAll('a[href]').forEach(el => {
                const href = el.getAttribute('href');
                if (href && href.toLowerCase().startsWith('javascript:')) {
                    el.setAttribute('href', '#');
                    el.addEventListener('click', function(e) {
                        e.preventDefault();
                        Toast.warning('⚠️ رابط غير آمن');
                    });
                }
            });

            // حماية من src="javascript:"
            document.querySelectorAll('img[src], iframe[src]').forEach(el => {
                const src = el.getAttribute('src');
                if (src && src.toLowerCase().startsWith('javascript:')) {
                    el.removeAttribute('src');
                }
            });
        },

        // ============================================================
        // تشفير وفك تشفير البيانات المحلية
        // ============================================================
        encryptData(data) {
            try {
                const json = JSON.stringify(data);
                // استخدام Base64 للتشفير البسيط
                return btoa(encodeURIComponent(json));
            } catch (e) {
                console.warn('⚠️ فشل تشفير البيانات:', e);
                return data;
            }
        },

        decryptData(encrypted) {
            try {
                if (typeof encrypted !== 'string') return encrypted;
                const json = decodeURIComponent(atob(encrypted));
                return JSON.parse(json);
            } catch (e) {
                console.warn('⚠️ فشل فك تشفير البيانات:', e);
                return encrypted;
            }
        },

        // ============================================================
        // حفظ واسترجاع آمن في localStorage
        // ============================================================
        secureSet(key, value) {
            try {
                // التحقق من صحة البيانات
                if (value === undefined || value === null) {
                    localStorage.removeItem(key);
                    return;
                }
                
                const encrypted = this.encryptData(value);
                localStorage.setItem(key, encrypted);
                return true;
            } catch (e) {
                console.warn('⚠️ فشل حفظ البيانات:', e);
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                } catch (err) {
                    console.error('❌ فشل حفظ البيانات:', err);
                }
                return false;
            }
        },

        secureGet(key) {
            try {
                const data = localStorage.getItem(key);
                if (!data) return null;
                
                // محاولة فك التشفير
                try {
                    return this.decryptData(data);
                } catch (e) {
                    // إذا فشل، محاولة قراءة كـ JSON
                    return JSON.parse(data);
                }
            } catch (e) {
                console.warn('⚠️ فشل استرجاع البيانات:', e);
                return null;
            }
        },

        // ============================================================
        // Rate Limiting - منع الهجمات المتكررة
        // ============================================================
        rateLimit(action, key, limit = 10, windowTime = 60000) {
            const now = Date.now();
            
            // تهيئة المصفوفة إذا لم تكن موجودة
            if (!state.codeAttempts[key]) {
                state.codeAttempts[key] = [];
            }
            
            // تصفية المحاولات القديمة
            const attempts = state.codeAttempts[key].filter(t => now - t < windowTime);
            state.codeAttempts[key] = attempts;
            
            // التحقق من العدد
            if (attempts.length >= limit) {
                const waitTime = Math.ceil((windowTime - (now - attempts[0])) / 1000);
                Toast.warning(`⚠️ تجاوزت الحد المسموح، حاول بعد ${waitTime} ثانية`);
                return false;
            }
            
            // إضافة المحاولة الجديدة
            attempts.push(now);
            return true;
        },

        // ============================================================
        // تسجيل الخروج التلقائي بعد الخمول
        // ============================================================
        startInactivityTimer() {
            const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 دقيقة
            const WARNING_TIMEOUT = 25 * 60 * 1000; // 25 دقيقة (تحذير)
            
            let warningShown = false;
            
            const resetTimer = () => {
                // تحديث وقت آخر نشاط
                state.lastActivity = Date.now();
                warningShown = false;
                
                // إلغاء المؤقت الحالي
                clearTimeout(state.inactivityTimer);
                
                // تعيين مؤقت جديد
                state.inactivityTimer = setTimeout(() => {
                    // عرض تحذير قبل 5 دقائق
                    if (!warningShown) {
                        warningShown = true;
                        Toast.warning('⏰ ستسجيل الخروج تلقائياً خلال 5 دقائق لعدم النشاط');
                        
                        // تعيين مؤقت للخروج الفعلي
                        setTimeout(() => {
                            if (state.user && Date.now() - state.lastActivity > INACTIVITY_TIMEOUT) {
                                Auth.signOut();
                                Toast.warning('⏰ تم تسجيل الخروج تلقائياً لعدم النشاط');
                            }
                        }, WARNING_TIMEOUT);
                    }
                }, WARNING_TIMEOUT);
            };

            // إعادة تعيين عند أي نشاط
            const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'touchmove'];
            events.forEach(event => {
                document.addEventListener(event, resetTimer);
            });

            // بدء المؤقت
            resetTimer();
            
            // حفظ مرجع للتوقف
            this._inactivityEvents = events;
            this._inactivityReset = resetTimer;
        },

        // ============================================================
        // إيقاف مؤقت الخمول
        // ============================================================
        stopInactivityTimer() {
            clearTimeout(state.inactivityTimer);
            if (this._inactivityEvents) {
                this._inactivityEvents.forEach(event => {
                    document.removeEventListener(event, this._inactivityReset);
                });
            }
        },

        // ============================================================
        // التحقق من صحة البريد الإلكتروني
        // ============================================================
        validateEmail(email) {
            if (!email) return false;
            const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            return regex.test(email);
        },

        // ============================================================
        // التحقق من قوة كلمة المرور
        // ============================================================
        validatePassword(password) {
            if (!password || password.length < 6) {
                return { valid: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
            }
            
            let score = 0;
            if (password.length >= 8) score++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
            if (/\d/.test(password)) score++;
            if (/[^a-zA-Z0-9]/.test(password)) score++;
            
            const strength = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
            const color = ['#ef4444', '#f59e0b', '#f59e0b', '#22c55e', '#22c55e'];
            
            return {
                valid: score >= 2,
                score: score,
                strength: strength[Math.min(score, 4)],
                color: color[Math.min(score, 4)],
                message: score >= 2 ? 'كلمة مرور قوية' : 'كلمة المرور ضعيفة'
            };
        },

        // ============================================================
        // منع هجمات SQL Injection
        // ============================================================
        sanitizeSQL(input) {
            if (typeof input !== 'string') return input;
            return input
                .replace(/['"\\;]/g, '')
                .replace(/--/g, '')
                .replace(/\/\*/g, '')
                .replace(/\*\//g, '');
        },

        // ============================================================
        // التحقق من صحة المعرف (UUID)
        // ============================================================
        isValidUUID(uuid) {
            if (!uuid) return false;
            const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return regex.test(uuid);
        }
    };

    // ============================================================
    // 4) TOAST SYSTEM - نظام الإشعارات المتقدم
    // ============================================================
    // نظام عرض الإشعارات بتصميم احترافي
    // يدعم 4 أنواع: نجاح، خطأ، تحذير، معلومات
    // ============================================================

    const Toast = {
        // ============================================================
        // عرض إشعار
        // ============================================================
        show(type, message, duration = 4000) {
            // التحقق من وجود حاوية الإشعارات
            let container = document.getElementById('toastContainer');
            
            if (!container) {
                container = document.createElement('div');
                container.className = 'toast-container';
                container.id = 'toastContainer';
                document.body.appendChild(container);
            }

            // إنشاء عنصر الإشعار
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            // إضافة أيقونة حسب النوع
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            
            const icon = icons[type] || '📌';
            toast.innerHTML = `${icon} ${message}`;
            
            // إضافة تأثير الظهور
            toast.style.animation = 'slideUp 0.4s ease';
            
            // إضافة إلى الحاوية
            container.appendChild(toast);
            
            // إزالة تلقائية بعد المدة
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                toast.style.transition = 'all 0.4s ease';
                
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 400);
            }, duration);
        },
        
        // ============================================================
        // اختصارات لأنواع الإشعارات
        // ============================================================
        success(msg) { 
            this.show('success', msg); 
        },
        
        error(msg) { 
            this.show('error', msg); 
        },
        
        info(msg) { 
            this.show('info', msg); 
        },
        
        warning(msg) { 
            this.show('warning', msg); 
        },

        // ============================================================
        // إشعار تفاعلي مع أزرار
        // ============================================================
        interactive(message, actions, duration = 8000) {
            let container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.className = 'toast-container';
                container.id = 'toastContainer';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = 'toast info';
            toast.style.padding = '1rem';
            toast.style.width = '100%';
            toast.style.maxWidth = '400px';
            
            let html = `<div style="margin-bottom:0.5rem;">${message}</div><div style="display:flex;gap:0.5rem;justify-content:center;">`;
            
            actions.forEach(action => {
                html += `
                    <button onclick="${action.callback}" 
                            style="padding:0.3rem 1rem;border:none;border-radius:8px;background:white;color:var(--primary);font-weight:600;cursor:pointer;">
                        ${action.label}
                    </button>
                `;
            });
            
            html += '</div>';
            toast.innerHTML = html;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                toast.style.transition = 'all 0.4s ease';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 400);
            }, duration);
        }
    };

    // ============================================================
    // 5) AUTH & USER MANAGEMENT - إدارة المستخدمين
    // ============================================================
    // جميع دوال المصادقة وإدارة المستخدمين
    // ============================================================

    const Auth = {
        // ============================================================
        // التحقق من الجلسة الحالية
        // ============================================================
        async checkSession() {
            try {
                if (!supabaseClient) {
                    console.warn('⚠️ Supabase غير متاح');
                    return false;
                }
                
                const { data: { session }, error } = await supabaseClient.auth.getSession();
                
                if (error) {
                    console.warn('⚠️ خطأ في التحقق من الجلسة:', error);
                    return false;
                }
                
                if (session?.user) {
                    state.user = session.user;
                    
                    // حفظ بيانات المستخدم مشفرة
                    Security.secureSet('devAcademicUser', {
                        email: state.user.email,
                        name: state.user.user_metadata?.full_name || '',
                        id: state.user.id,
                        role: state.user.user_metadata?.role || 'student'
                    });
                    
                    // تحديث الواجهة
                    this.updateUI();
                    
                    // تسجيل دخول ناجح
                    Toast.success('✅ مرحباً بعودتك');
                    
                    // تسجيل النشاط
                    this.logActivity('login', { method: 'session' });
                    
                    return true;
                }
                
                return false;
                
            } catch (error) {
                console.warn('⚠️ خطأ في التحقق من الجلسة:', error);
                return false;
            }
        },

        // ============================================================
        // تسجيل الدخول
        // ============================================================
        async login(email, password) {
            try {
                // التحقق من صحة البريد الإلكتروني
                if (!Security.validateEmail(email)) {
                    Toast.error('❌ البريد الإلكتروني غير صحيح');
                    return false;
                }

                // التحقق من كلمة المرور
                if (!password || password.length < 6) {
                    Toast.error('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
                    return false;
                }

                // Rate Limiting
                if (!Security.rateLimit('login', `login_${email}`, 5, 300000)) {
                    return false;
                }

                // محاولة تسجيل الدخول
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        Toast.error('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة');
                    } else if (error.message.includes('Email not confirmed')) {
                        Toast.warning('⚠️ يرجى تأكيد بريدك الإلكتروني أولاً');
                    } else {
                        Toast.error('❌ ' + error.message);
                    }
                    return false;
                }

                if (data?.user) {
                    state.user = data.user;
                    
                    // حفظ بيانات المستخدم
                    Security.secureSet('devAcademicUser', {
                        email: state.user.email,
                        name: state.user.user_metadata?.full_name || '',
                        id: state.user.id,
                        role: state.user.user_metadata?.role || 'student'
                    });
                    
                    // تحديث الواجهة
                    this.updateUI();
                    
                    // تسجيل النشاط
                    this.logActivity('login', { method: 'password' });
                    
                    Toast.success('✅ تم تسجيل الدخول بنجاح');
                    
                    // إعادة توجيه إلى لوحة التحكم
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 500);
                    
                    return true;
                }
                
                return false;
                
            } catch (error) {
                console.error('❌ خطأ في تسجيل الدخول:', error);
                Toast.error('❌ حدث خطأ في تسجيل الدخول');
                return false;
            }
        },

        // ============================================================
        // إنشاء حساب جديد
        // ============================================================
        async register(email, password, fullName, role = 'student') {
            try {
                // التحقق من صحة البريد الإلكتروني
                if (!Security.validateEmail(email)) {
                    Toast.error('❌ البريد الإلكتروني غير صحيح');
                    return false;
                }

                // التحقق من كلمة المرور
                const passwordCheck = Security.validatePassword(password);
                if (!passwordCheck.valid) {
                    Toast.error('❌ ' + passwordCheck.message);
                    return false;
                }

                // التحقق من الاسم
                if (!fullName || fullName.trim().length < 2) {
                    Toast.error('❌ يرجى إدخال الاسم الكامل');
                    return false;
                }

                // Rate Limiting
                if (!Security.rateLimit('register', `register_${email}`, 3, 300000)) {
                    return false;
                }

                // محاولة إنشاء الحساب
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName.trim(),
                            role: role
                        }
                    }
                });

                if (error) {
                    if (error.message.includes('User already registered')) {
                        Toast.warning('⚠️ هذا البريد الإلكتروني مسجل بالفعل');
                    } else {
                        Toast.error('❌ ' + error.message);
                    }
                    return false;
                }

                if (data?.user) {
                    Toast.success('✅ تم إنشاء الحساب بنجاح! تحقق من بريدك للتأكيد');
                    
                    // تسجيل النشاط
                    this.logActivity('register', { email: email, role: role });
                    
                    return true;
                }
                
                return false;
                
            } catch (error) {
                console.error('❌ خطأ في إنشاء الحساب:', error);
                Toast.error('❌ حدث خطأ في إنشاء الحساب');
                return false;
            }
        },

        // ============================================================
        // تسجيل الخروج
        // ============================================================
        async signOut() {
            try {
                // تسجيل النشاط
                if (state.user) {
                    this.logActivity('logout', {});
                }
                
                if (supabaseClient) {
                    await supabaseClient.auth.signOut();
                }
                
                // مسح البيانات المحلية
                localStorage.removeItem('devAcademicUser');
                
                // إعادة تعيين الحالة
                state.user = null;
                state.isAdmin = false;
                state.isTeacher = false;
                state.isGuest = false;
                
                // إيقاف مؤقت الخمول
                Security.stopInactivityTimer();
                
                // تحديث الواجهة
                this.updateUI();
                
                Toast.success('✅ تم تسجيل الخروج بنجاح');
                
                // إعادة توجيه إلى صفحة تسجيل الدخول
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
                
            } catch (error) {
                console.error('❌ خطأ في تسجيل الخروج:', error);
                Toast.error('❌ حدث خطأ في تسجيل الخروج');
            }
        },

        // ============================================================
        // الدخول كضيف
        // ============================================================
        enterAsGuest() {
            state.isGuest = true;
            state.user = null;
            
            Security.secureSet('devAcademicUser', {
                guest: true,
                name: 'ضيف'
            });
            
            this.updateUI();
            
            Toast.info('👋 مرحباً ضيف، سجل دخولك للمزيد من الميزات');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        },

        // ============================================================
        // تحديث واجهة المستخدم
        // ============================================================
        updateUI() {
            const nameDisplay = document.getElementById('userNameDisplay');
            const avatarDisplay = document.getElementById('userAvatar');
            
            if (state.user) {
                const name = state.user.user_metadata?.full_name || 
                            state.user.email?.split('@')[0] || 'مستخدم';
                if (nameDisplay) nameDisplay.textContent = name;
                if (avatarDisplay) {
                    avatarDisplay.textContent = name.charAt(0).toUpperCase();
                    avatarDisplay.style.background = 'var(--primary-gradient)';
                }
            } else {
                const guest = Security.secureGet('devAcademicUser');
                if (guest?.guest) {
                    if (nameDisplay) {
                        nameDisplay.textContent = '👤 ضيف';
                        nameDisplay.style.color = 'var(--text-light)';
                    }
                    if (avatarDisplay) {
                        avatarDisplay.textContent = '👤';
                        avatarDisplay.style.background = 'var(--bg-card)';
                        avatarDisplay.style.color = 'var(--text-light)';
                    }
                } else {
                    if (nameDisplay) {
                        nameDisplay.textContent = 'غير مسجل';
                        nameDisplay.style.color = 'var(--text-light)';
                    }
                    if (avatarDisplay) {
                        avatarDisplay.textContent = '👤';
                        avatarDisplay.style.background = 'var(--bg-card)';
                        avatarDisplay.style.color = 'var(--text-light)';
                    }
                }
            }
        },

        // ============================================================
        // الحصول على دور المستخدم
        // ============================================================
        getRole() {
            if (!state.user) return 'guest';
            return state.user.user_metadata?.role || 'student';
        },

        // ============================================================
        // التحقق من صلاحية المشرف
        // ============================================================
        isAdmin() {
            return state.isAdmin;
        },

        // ============================================================
        // التحقق من صلاحية المدرس
        // ============================================================
        isTeacher() {
            return state.isTeacher;
        },

        // ============================================================
        // التحقق من صلاحية المشرف من قاعدة البيانات
        // ============================================================
        async verifyAdmin() {
            if (!state.user) return false;
            
            try {
                if (!supabaseClient) return false;
                
                const { data, error } = await supabaseClient
                    .from('admins')
                    .select('uid, email, role')
                    .eq('uid', state.user.id)
                    .maybeSingle();
                
                if (error) {
                    console.warn('⚠️ فشل التحقق من صلاحية المشرف:', error);
                    return false;
                }
                
                state.isAdmin = !!data;
                
                if (state.isAdmin) {
                    const adminBtn = document.getElementById('adminPanelBtn');
                    if (adminBtn) adminBtn.style.display = 'flex';
                }
                
                return state.isAdmin;
                
            } catch (e) {
                console.warn('⚠️ خطأ في التحقق من المشرف:', e);
                return false;
            }
        },

        // ============================================================
        // تسجيل نشاط المستخدم
        // ============================================================
        async logActivity(action, details = {}) {
            if (!supabaseClient) return;
            
            try {
                const { error } = await supabaseClient
                    .from('audit_log')
                    .insert({
                        user_id: state.user?.id || null,
                        user_email: state.user?.email || null,
                        action: action,
                        details: details,
                        ip_address: await this.getClientIP(),
                        user_agent: navigator.userAgent
                    });
                
                if (error) {
                    console.warn('⚠️ فشل تسجيل النشاط:', error);
                }
            } catch (error) {
                console.warn('⚠️ فشل تسجيل النشاط:', error);
            }
        },

        // ============================================================
        // الحصول على عنوان IP للمستخدم
        // ============================================================
        async getClientIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip || 'unknown';
            } catch (e) {
                return 'unknown';
            }
        },

        // ============================================================
        // إعادة تعيين كلمة المرور
        // ============================================================
        async resetPassword(email) {
            try {
                if (!Security.validateEmail(email)) {
                    Toast.error('❌ البريد الإلكتروني غير صحيح');
                    return false;
                }

                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/reset-password.html'
                });

                if (error) throw error;

                Toast.success('✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك');
                return true;

            } catch (error) {
                console.error('❌ خطأ في إعادة تعيين كلمة المرور:', error);
                Toast.error('❌ ' + error.message);
                return false;
            }
        },

        // ============================================================
        // تحديث كلمة المرور
        // ============================================================
        async updatePassword(newPassword) {
            try {
                const passwordCheck = Security.validatePassword(newPassword);
                if (!passwordCheck.valid) {
                    Toast.error('❌ ' + passwordCheck.message);
                    return false;
                }

                const { error } = await supabaseClient.auth.updateUser({
                    password: newPassword
                });

                if (error) throw error;

                Toast.success('✅ تم تحديث كلمة المرور بنجاح');
                return true;

            } catch (error) {
                console.error('❌ خطأ في تحديث كلمة المرور:', error);
                Toast.error('❌ ' + error.message);
                return false;
            }
        },

        // ============================================================
        // تحديث بيانات المستخدم
        // ============================================================
        async updateProfile(data) {
            try {
                const { error } = await supabaseClient.auth.updateUser({
                    data: data
                });

                if (error) throw error;

                // تحديث الحالة المحلية
                if (state.user) {
                    state.user.user_metadata = { ...state.user.user_metadata, ...data };
                }

                this.updateUI();
                Toast.success('✅ تم تحديث الملف الشخصي بنجاح');
                return true;

            } catch (error) {
                console.error('❌ خطأ في تحديث الملف الشخصي:', error);
                Toast.error('❌ ' + error.message);
                return false;
            }
        }
    };

    // ============================================================
    // 6) DOM CACHE - تخزين عناصر الصفحة
    // ============================================================

    const DOM = {
        // ============================================================
        // دوال مساعدة للوصول إلى العناصر
        // ============================================================
        get: (id) => document.getElementById(id),
        qs: (selector) => document.querySelector(selector),
        qsa: (selector) => document.querySelectorAll(selector),
        
        // ============================================================
        // العناصر الرئيسية في الصفحة
        // ============================================================
        userName: document.getElementById('userNameDisplay'),
        userAvatar: document.getElementById('userAvatar'),
        teachersGrid: document.getElementById('teachersGrid'),
        gradeFilter: document.getElementById('gradeFilter'),
        teachersCount: document.getElementById('teachersCount'),
        myClassesGrid: document.getElementById('myClassesGrid'),
        classesBadge: document.getElementById('classesBadge'),
        themeToggle: document.getElementById('themeToggle'),
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.getElementById('searchBtn'),
        adminPanelBtn: document.getElementById('adminPanelBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        breadcrumb: document.getElementById('breadcrumbText'),
        pageTitle: document.getElementById('pageTitle'),
        
        // ============================================================
        // النوافذ المنبثقة
        // ============================================================
        teacherClassesModal: document.getElementById('teacherClassesModal'),
        classStudentsModal: document.getElementById('classStudentsModal'),
        studentProgressModal: document.getElementById('studentProgressModal'),
        adminPanel: document.getElementById('adminPanel'),
        
        // ============================================================
        // إحصائيات لوحة الإدارة
        // ============================================================
        totalStudents: document.getElementById('totalStudents'),
        totalTeachers: document.getElementById('totalTeachers'),
        totalClasses: document.getElementById('totalClasses'),
        totalLectures: document.getElementById('totalLectures'),
        studentsProgressList: document.getElementById('studentsProgressList'),
    };

    // ============================================================
    // 7) DATA LOADING - تحميل البيانات من قاعدة البيانات
    // ============================================================

    const Data = {
        // ============================================================
        // تحميل جميع البيانات
        // ============================================================
        async loadAll() {
            try {
                state.loading = true;
                
                // عرض مؤشر التحميل
                this.showLoading();
                
                if (!supabaseClient) {
                    Toast.error('❌ Supabase غير متاح');
                    state.loading = false;
                    this.hideLoading();
                    return false;
                }
                
                // ============================================================
                // تحميل الصفوف الدراسية
                // ============================================================
                const { data: grades, error: gradesError } = await supabaseClient
                    .from('grades')
                    .select('*')
                    .order('level', { ascending: true });
                
                if (gradesError) throw gradesError;
                state.grades = grades || [];
                console.log(`✅ تم تحميل ${state.grades.length} صف`);

                // ============================================================
                // تحميل المدرسين مع العلاقات
                // ============================================================
                const { data: teachers, error: teachersError } = await supabaseClient
                    .from('teachers')
                    .select(`
                        *,
                        users:user_id (id, full_name, email, avatar_url),
                        grades:grade_id (id, name, emoji)
                    `)
                    .eq('is_active', true);
                
                if (teachersError) throw teachersError;
                state.teachers = teachers || [];
                console.log(`✅ تم تحميل ${state.teachers.length} مدرس`);

                // ============================================================
                // تحميل الفصول
                // ============================================================
                const { data: classes, error: classesError } = await supabaseClient
                    .from('classes')
                    .select(`
                        *,
                        teachers:teacher_id (
                            id, user_id, subject,
                            users:user_id (id, full_name, email),
                            grades:grade_id (id, name)
                        )
                    `)
                    .eq('is_active', true);
                
                if (classesError) throw classesError;
                state.classes = classes || [];
                console.log(`✅ تم تحميل ${state.classes.length} فصل`);

                // ============================================================
                // تحميل فصول الطالب
                // ============================================================
                if (state.user) {
                    const { data: myClasses, error: myClassesError } = await supabaseClient
                        .from('class_students')
                        .select(`
                            *,
                            classes:class_id (
                                *,
                                teachers:teacher_id (
                                    *,
                                    users:user_id (id, full_name, email)
                                )
                            )
                        `)
                        .eq('student_id', state.user.id)
                        .eq('is_active', true);
                    
                    if (myClassesError) throw myClassesError;
                    state.myClasses = myClasses || [];
                    console.log(`✅ تم تحميل ${state.myClasses.length} فصل للطالب`);
                }

                state.loading = false;
                this.hideLoading();
                
                // عرض البيانات
                this.renderAll();
                
                // التحقق من صلاحية المشرف
                const isAdmin = await Auth.verifyAdmin();
                if (isAdmin && DOM.adminPanelBtn) {
                    DOM.adminPanelBtn.style.display = 'flex';
                }
                
                // تحديث حالة الاتصال
                state.connectionStatus = true;
                
                Toast.success('✅ تم تحميل البيانات بنجاح');
                return true;
                
            } catch (error) {
                console.error('❌ فشل تحميل البيانات:', error);
                Toast.error('❌ فشل تحميل البيانات: ' + (error.message || 'خطأ غير معروف'));
                state.loading = false;
                this.hideLoading();
                state.connectionStatus = false;
                return false;
            }
        },

        // ============================================================
        // عرض مؤشر التحميل
        // ============================================================
        showLoading() {
            const containers = [DOM.teachersGrid, DOM.myClassesGrid];
            containers.forEach(container => {
                if (container) {
                    container.innerHTML = `
                        <div style="text-align:center;padding:2rem;grid-column:1/-1;">
                            <div style="display:inline-block;width:40px;height:40px;border:4px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                            <p style="margin-top:0.5rem;color:var(--text-light);">جاري التحميل...</p>
                        </div>
                    `;
                }
            });
        },

        // ============================================================
        // إخفاء مؤشر التحميل
        // ============================================================
        hideLoading() {
            // سيتم استبدال المحتوى عند عرض البيانات
        },

        // ============================================================
        // عرض جميع البيانات في الواجهة
        // ============================================================
        renderAll() {
            this.renderGradesFilter();
            this.renderTeachers();
            this.renderMyClasses();
            this.updateBadge();
        },

        // ============================================================
        // عرض أزرار تصفية الصفوف
        // ============================================================
        renderGradesFilter() {
            if (!DOM.gradeFilter) return;
            
            let html = `
                <button class="filter-btn active" data-grade="all" onclick="App.setFilter('all')">
                    <span class="btn-icon">🏫</span> الكل
                    <span class="btn-count">${state.teachers.length}</span>
                </button>
            `;
            
            state.grades.forEach(grade => {
                const count = state.teachers.filter(t => t.grade_id === grade.id).length;
                html += `
                    <button class="filter-btn" data-grade="${grade.id}" onclick="App.setFilter('${grade.id}')">
                        <span class="btn-icon">${grade.emoji || '📚'}</span> ${grade.name}
                        <span class="btn-count">${count}</span>
                    </button>
                `;
            });
            
            DOM.gradeFilter.innerHTML = html;
        },

        // ============================================================
        // عرض المدرسين مع البحث والفلتر
        // ============================================================
        renderTeachers(searchTerm = '') {
            if (!DOM.teachersGrid) return;
            
            let filtered = state.teachers;
            
            // تطبيق فلتر الصف
            if (state.currentFilter !== 'all') {
                filtered = filtered.filter(t => t.grade_id === state.currentFilter);
            }
            
            // تطبيق البحث
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filtered = filtered.filter(t => {
                    const name = t.users?.full_name?.toLowerCase() || '';
                    const subject = t.subject?.toLowerCase() || '';
                    const gradeName = t.grades?.name?.toLowerCase() || '';
                    return name.includes(term) || subject.includes(term) || gradeName.includes(term);
                });
            }

            // تحديث العداد
            if (DOM.teachersCount) {
                DOM.teachersCount.textContent = filtered.length;
            }

            // عرض رسالة إذا لم يوجد مدرسين
            if (filtered.length === 0) {
                DOM.teachersGrid.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">👨‍🏫</span>
                        <h3>لا يوجد مدرسين</h3>
                        <p>${state.currentFilter === 'all' ? 'لم يتم إضافة أي مدرس بعد' : 'لا يوجد مدرسين في هذا الصف'}</p>
                        ${state.isAdmin ? `
                            <button onclick="App.navigateTo('admin')" style="margin-top:0.5rem;padding:0.4rem 1.2rem;background:var(--primary-gradient);color:white;border:none;border-radius:30px;font-weight:600;cursor:pointer;">
                                <i class="fas fa-plus"></i> إضافة مدرس
                            </button>
                        ` : ''}
                    </div>
                `;
                return;
            }

            // عرض المدرسين
            let html = '';
            filtered.forEach(teacher => {
                const user = teacher.users || {};
                const grade = teacher.grades || {};
                const classCount = state.classes.filter(c => c.teacher_id === teacher.id).length;
                
                // حساب نسبة التقدم (افتراضية)
                const progress = classCount > 0 ? Math.min(100, classCount * 15) : 0;
                
                html += `
                    <div class="teacher-card" onclick="App.openTeacherClasses('${teacher.id}')">
                        <div class="teacher-avatar">
                            ${user.avatar_url ? 
                                `<img src="${user.avatar_url}" alt="${user.full_name}" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='${user.full_name?.charAt(0).toUpperCase() || '👨‍🏫'}" />` : 
                                (user.full_name ? user.full_name.charAt(0).toUpperCase() : '👨‍🏫')}
                        </div>
                        <div class="teacher-name">${user.full_name || 'مدرس'}</div>
                        <div class="teacher-subject">${teacher.subject || 'مدرس'}</div>
                        <div class="teacher-meta">
                            📚 ${grade.name || 'بدون صف'} | 📖 ${classCount} فصل
                            ${teacher.experience_years ? ` | 🏆 ${teacher.experience_years} سنوات` : ''}
                        </div>
                        ${classCount > 0 ? `
                            <div class="progress-bar">
                                <div class="progress-fill" style="width:${progress}%;"></div>
                            </div>
                            <div class="progress-text">${classCount} فصول متاحة</div>
                        ` : `
                            <div style="margin-top:0.4rem;font-size:0.6rem;color:var(--text-light);">
                                لا توجد فصول بعد
                            </div>
                        `}
                        ${teacher.is_active === false ? `
                            <div style="position:absolute;top:0.5rem;left:0.5rem;background:var(--danger);color:white;padding:0.1rem 0.5rem;border-radius:20px;font-size:0.55rem;font-weight:700;">
                                غير مفعل
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            
            DOM.teachersGrid.innerHTML = html;
        },

        // ============================================================
        // عرض فصول الطالب
        // ============================================================
        renderMyClasses() {
            if (!DOM.myClassesGrid) return;

            if (!state.user && !state.isGuest) {
                DOM.myClassesGrid.innerHTML = `
                    <div class="empty-state" style="grid-column:1/-1;">
                        <span class="empty-icon">🔒</span>
                        <h3>يرجى تسجيل الدخول</h3>
                        <p>سجل الدخول لمشاهدة فصولك الدراسية</p>
                        <button onclick="window.location.href='index.html'" style="margin-top:0.8rem;padding:0.5rem 1.5rem;background:var(--primary-gradient);color:white;border:none;border-radius:30px;font-weight:600;cursor:pointer;">
                            <i class="fas fa-sign-in-alt"></i> تسجيل الدخول
                        </button>
                    </div>
                `;
                return;
            }

            if (state.myClasses.length === 0) {
                DOM.myClassesGrid.innerHTML = `
                    <div class="empty-state" style="grid-column:1/-1;">
                        <span class="empty-icon">📚</span>
                        <h3>لا توجد فصول مسجلة</h3>
                        <p>سجل في فصول من خلال استعراض المدرسين</p>
                        <button onclick="App.navigateTo('teachers')" style="margin-top:0.8rem;padding:0.5rem 1.5rem;background:var(--primary-gradient);color:white;border:none;border-radius:30px;font-weight:600;cursor:pointer;">
                            <i class="fas fa-search"></i> استعراض المدرسين
                        </button>
                    </div>
                `;
                return;
            }

            let html = '';
            state.myClasses.forEach(enrollment => {
                const cls = enrollment.classes || {};
                const teacher = cls.teachers || {};
                const teacherUser = teacher.users || {};
                
                // حساب تقدم الطالب في هذا الفصل
                const progress = enrollment.progress_percent || 0;
                
                html += `
                    <div class="teacher-card" onclick="App.openClassStudents('${cls.id}')">
                        <div class="teacher-avatar" style="background:linear-gradient(135deg,#22C55E,#16A34A);">
                            📚
                        </div>
                        <div class="teacher-name">${cls.name || 'فصل'}</div>
                        <div class="teacher-subject">مع ${teacherUser.full_name || 'مدرس'}</div>
                        <div class="teacher-meta">${teacher.subject || ''}</div>
                        <div class="progress-bar" style="margin-top:0.4rem;">
                            <div class="progress-fill" style="width:${progress}%;"></div>
                        </div>
                        <div class="progress-text">${progress}% مكتمل</div>
                        <div style="margin-top:0.3rem;padding:0.15rem 0.8rem;background:var(--success);color:white;border-radius:20px;font-size:0.65rem;font-weight:600;display:inline-block;">
                            ✅ مسجل
                        </div>
                    </div>
                `;
            });
            
            DOM.myClassesGrid.innerHTML = html;
        },

        // ============================================================
        // تحديث العلامة (Badge)
        // ============================================================
        updateBadge() {
            if (!DOM.classesBadge) return;
            
            if (state.myClasses.length > 0) {
                DOM.classesBadge.style.display = 'inline';
                DOM.classesBadge.textContent = state.myClasses.length;
            } else {
                DOM.classesBadge.style.display = 'none';
            }
        },

        // ============================================================
        // إعادة تحميل البيانات
        // ============================================================
        async refresh() {
            Toast.info('🔄 جاري تحديث البيانات...');
            return await this.loadAll();
        }
    };

    // ============================================================
    // 8) APP CONTROLLER - التحكم الرئيسي للتطبيق
    // ============================================================

    const App = {
        // ============================================================
        // تعيين فلتر الصف
        // ============================================================
        setFilter(gradeId) {
            state.currentFilter = gradeId;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.grade === gradeId);
            });
            Data.renderTeachers();
        },

        // ============================================================
        // فتح فصول المدرس
        // ============================================================
        async openTeacherClasses(teacherId) {
            // التحقق من صحة المعرف
            if (!Security.isValidUUID(teacherId)) {
                Toast.error('❌ معرف غير صحيح');
                return;
            }

            const teacher = state.teachers.find(t => t.id === teacherId);
            if (!teacher) {
                Toast.error('❌ المدرس غير موجود');
                return;
            }

            const user = teacher.users || {};
            const grade = teacher.grades || {};
            
            // تحديث عنوان النافذة
            const titleEl = document.getElementById('teacherClassesTitle');
            const subtitleEl = document.getElementById('teacherClassesSubtitle');
            
            if (titleEl) titleEl.textContent = `👨‍🏫 ${user.full_name || 'مدرس'}`;
            if (subtitleEl) subtitleEl.textContent = `${grade.name || ''} | ${teacher.subject || ''}`;

            // جلب فصول المدرس
            const teacherClasses = state.classes.filter(c => c.teacher_id === teacherId);
            
            let html = '';
            if (teacherClasses.length === 0) {
                html = `
                    <div class="empty-state">
                        <span class="empty-icon">📚</span>
                        <h3>لا توجد فصول</h3>
                        <p>لم يتم إضافة أي فصل لهذا المدرس بعد</p>
                    </div>
                `;
            } else {
                html = '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
                for (const cls of teacherClasses) {
                    try {
                        // جلب عدد الطلاب في الفصل
                        const { data: studentCount, error: countError } = await supabaseClient
                            .from('class_students')
                            .select('id', { count: 'exact' })
                            .eq('class_id', cls.id)
                            .eq('is_active', true);
                        
                        if (countError) throw countError;
                        
                        const count = studentCount?.length || 0;
                        
                        // التحقق مما إذا كان الطالب مسجلاً في هذا الفصل
                        let isEnrolled = false;
                        if (state.user) {
                            const { data: enrollment } = await supabaseClient
                                .from('class_students')
                                .select('id')
                                .eq('student_id', state.user.id)
                                .eq('class_id', cls.id)
                                .eq('is_active', true)
                                .maybeSingle();
                            isEnrolled = !!enrollment;
                        }
                        
                        html += `
                            <div class="student-item" onclick="App.openClassStudents('${cls.id}')">
                                <div class="student-avatar" style="background:linear-gradient(135deg,#8B5CF6,#A78BFA);">
                                    📚
                                </div>
                                <div class="student-info">
                                    <div class="student-name">${cls.name}</div>
                                    <div class="student-email">${cls.description || 'فصل دراسي'} | 🧑‍🎓 ${count} طالب</div>
                                    ${isEnrolled ? '<span style="font-size:0.55rem;color:var(--success);">✅ مسجل</span>' : ''}
                                </div>
                                <div class="student-progress">
                                    <div class="progress-number">${count}</div>
                                    <div class="progress-label">طالب</div>
                                </div>
                            </div>
                        `;
                    } catch (error) {
                        console.warn('⚠️ فشل جلب عدد الطلاب:', error);
                    }
                }
                html += '</div>';
            }
            
            const listEl = document.getElementById('teacherClassesList');
            if (listEl) listEl.innerHTML = html;
            
            if (DOM.teacherClassesModal) {
                DOM.teacherClassesModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        },

        // ============================================================
        // فتح طلاب الفصل
        // ============================================================
        async openClassStudents(classId) {
            // التحقق من صحة المعرف
            if (!Security.isValidUUID(classId)) {
                Toast.error('❌ معرف غير صحيح');
                return;
            }

            const cls = state.classes.find(c => c.id === classId);
            if (!cls) {
                Toast.error('❌ الفصل غير موجود');
                return;
            }

            const teacher = cls.teachers || {};
            const teacherUser = teacher.users || {};
            
            // تحديث عنوان النافذة
            const titleEl = document.getElementById('classStudentsTitle');
            const subtitleEl = document.getElementById('classStudentsSubtitle');
            
            if (titleEl) titleEl.textContent = `📚 ${cls.name}`;
            if (subtitleEl) subtitleEl.textContent = `مع ${teacherUser.full_name || 'مدرس'}`;

            try {
                // جلب طلاب الفصل مع تقدمهم
                const { data: studentsData, error } = await supabaseClient
                    .rpc('get_class_students_with_progress', { p_class_id: classId });

                if (error) throw error;

                let html = '';
                if (!studentsData || studentsData.length === 0) {
                    html = `
                        <div class="empty-state">
                            <span class="empty-icon">👨‍🎓</span>
                            <h3>لا يوجد طلاب</h3>
                            <p>لم يتم تسجيل أي طالب في هذا الفصل بعد</p>
                            ${state.isAdmin ? `
                                <button onclick="App.showAddStudentModal('${classId}')" style="margin-top:0.5rem;padding:0.4rem 1.2rem;background:var(--primary-gradient);color:white;border:none;border-radius:30px;font-weight:600;cursor:pointer;">
                                    <i class="fas fa-user-plus"></i> إضافة طالب
                                </button>
                            ` : ''}
                        </div>
                    `;
                } else {
                    html = '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
                    studentsData.forEach(student => {
                        const progress = student.progress_percent || 0;
                        const completed = student.completed_lectures || 0;
                        const total = student.total_lectures || 0;
                        const isAdminOrTeacher = state.isAdmin || Auth.getRole() === 'teacher';
                        
                        // تحديد لون التقدم
                        let progressColor = 'var(--danger)';
                        if (progress >= 80) progressColor = 'var(--success)';
                        else if (progress >= 50) progressColor = 'var(--warning)';
                        else if (progress >= 25) progressColor = 'var(--primary)';
                        
                        html += `
                            <div class="student-item" ${isAdminOrTeacher ? `onclick="App.openStudentProgress('${student.student_id}')"` : ''}>
                                <div class="student-avatar">
                                    ${student.student_name ? student.student_name.charAt(0).toUpperCase() : '👤'}
                                </div>
                                <div class="student-info">
                                    <div class="student-name">${student.student_name || 'طالب'}</div>
                                    <div class="student-email">${student.student_email || ''}</div>
                                    ${isAdminOrTeacher ? '<span style="font-size:0.55rem;color:var(--primary);">👆 اضغط للتفاصيل</span>' : ''}
                                </div>
                                <div class="student-progress" style="text-align:left;">
                                    <div class="progress-number" style="color:${progressColor};">${progress}%</div>
                                    <div class="progress-label">📖 ${completed}/${total}</div>
                                </div>
                            </div>
                        `;
                    });
                    html += '</div>';
                }

                const listEl = document.getElementById('classStudentsList');
                if (listEl) listEl.innerHTML = html;
                
                if (DOM.classStudentsModal) {
                    DOM.classStudentsModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
            } catch (error) {
                console.error('❌ فشل جلب الطلاب:', error);
                Toast.error('❌ فشل جلب الطلاب');
            }
        },

        // ============================================================
        // فتح تقدم الطالب (للمشرف والمدرس فقط)
        // ============================================================
        async openStudentProgress(studentId) {
            // التحقق من الصلاحية
            const role = Auth.getRole();
            if (!state.isAdmin && role !== 'teacher') {
                Toast.warning('⚠️ هذه الميزة متاحة للمشرفين والمدرسين فقط');
                return;
            }

            // التحقق من صحة المعرف
            if (!Security.isValidUUID(studentId)) {
                Toast.error('❌ معرف غير صحيح');
                return;
            }

            try {
                // جلب بيانات الطالب
                const { data: userData, error: userError } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('id', studentId)
                    .single();

                if (userError) throw userError;

                // تحديث عنوان النافذة
                const titleEl = document.getElementById('studentProgressTitle');
                if (titleEl) {
                    titleEl.textContent = `📊 تقدم ${userData?.full_name || 'الطالب'}`;
                }

                // جلب فصول الطالب مع التقدم
                const { data: studentClasses, error: classesError } = await supabaseClient
                    .rpc('get_student_classes_with_progress', { p_student_id: studentId });

                if (classesError) throw classesError;

                let html = '';
                if (!studentClasses || studentClasses.length === 0) {
                    html = `
                        <div class="empty-state">
                            <span class="empty-icon">📚</span>
                            <h3>الطالب غير مسجل في أي فصل</h3>
                        </div>
                    `;
                } else {
                    // حساب الإحصائيات العامة
                    const totalProgress = studentClasses.reduce((sum, c) => sum + (c.progress_percent || 0), 0);
                    const avgProgress = Math.round(totalProgress / studentClasses.length);
                    const totalCompleted = studentClasses.reduce((sum, c) => sum + (c.completed_lectures || 0), 0);
                    const totalLectures = studentClasses.reduce((sum, c) => sum + (c.total_lectures || 0), 0);
                    
                    html = `
                        <div style="margin-bottom:1rem;padding:1rem;background:var(--bg);border-radius:var(--radius);text-align:center;border:1px solid var(--border);">
                            <span style="font-size:2.5rem;">${userData?.full_name?.charAt(0).toUpperCase() || '👤'}</span>
                            <h3 style="margin:0.2rem 0;">${userData?.full_name || 'طالب'}</h3>
                            <p style="color:var(--text-light);font-size:0.85rem;">${userData?.email || ''}</p>
                            <div style="display:flex;justify-content:center;gap:2rem;margin-top:0.5rem;flex-wrap:wrap;">
                                <div style="background:var(--bg-card);padding:0.3rem 1rem;border-radius:8px;border:1px solid var(--border);">
                                    <strong>${studentClasses.length}</strong>
                                    <span style="color:var(--text-light);font-size:0.75rem;display:block;">فصل</span>
                                </div>
                                <div style="background:var(--bg-card);padding:0.3rem 1rem;border-radius:8px;border:1px solid var(--border);">
                                    <strong>${totalCompleted}/${totalLectures}</strong>
                                    <span style="color:var(--text-light);font-size:0.75rem;display:block;">محاضرات</span>
                                </div>
                                <div style="background:var(--bg-card);padding:0.3rem 1rem;border-radius:8px;border:1px solid var(--border);">
                                    <strong style="color:${avgProgress >= 80 ? 'var(--success)' : avgProgress >= 50 ? 'var(--warning)' : 'var(--danger)'};">${avgProgress}%</strong>
                                    <span style="color:var(--text-light);font-size:0.75rem;display:block;">المعدل العام</span>
                                </div>
                            </div>
                        </div>
                        <h4 style="margin-bottom:0.5rem;">📖 تفاصيل الفصول</h4>
                        <div style="display:flex;flex-direction:column;gap:0.5rem;">
                    `;
                    
                    studentClasses.forEach(cls => {
                        const progress = cls.progress_percent || 0;
                        const completed = cls.completed_lectures || 0;
                        const total = cls.total_lectures || 0;
                        
                        let progressColor = 'var(--danger)';
                        if (progress >= 80) progressColor = 'var(--success)';
                        else if (progress >= 50) progressColor = 'var(--warning)';
                        else if (progress >= 25) progressColor = 'var(--primary)';
                        
                        html += `
                            <div class="student-item" style="cursor:default;">
                                <div class="student-avatar" style="background:linear-gradient(135deg,#0EA5E9,#38BDF8);">
                                    📚
                                </div>
                                <div class="student-info">
                                    <div class="student-name">${cls.class_name || 'فصل'}</div>
                                    <div class="student-email">${cls.grade_name || ''} | مع ${cls.teacher_name || ''}</div>
                                    <div class="progress-bar" style="margin-top:0.3rem;">
                                        <div class="progress-fill" style="width:${progress}%;background:${progressColor};"></div>
                                    </div>
                                </div>
                                <div class="student-progress" style="text-align:left;">
                                    <div class="progress-number" style="color:${progressColor};">${progress}%</div>
                                    <div class="progress-label">📖 ${completed}/${total}</div>
                                </div>
                            </div>
                        `;
                    });
                    html += '</div>';
                }

                const contentEl = document.getElementById('studentProgressContent');
                if (contentEl) contentEl.innerHTML = html;
                
                if (DOM.studentProgressModal) {
                    DOM.studentProgressModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
            } catch (error) {
                console.error('❌ فشل تحميل تقدم الطالب:', error);
                Toast.error('❌ فشل تحميل تقدم الطالب');
            }
        },

        // ============================================================
        // فتح لوحة الإدارة
        // ============================================================
        openAdminPanel() {
            if (!state.isAdmin) {
                Toast.error('❌ غير مصرح لك بالدخول');
                return;
            }
            
            if (DOM.adminPanel) {
                DOM.adminPanel.classList.add('active');
                document.body.style.overflow = 'hidden';
                this.loadAdminStats();
            }
        },

        // ============================================================
        // إغلاق لوحة الإدارة
        // ============================================================
        closeAdminPanel() {
            if (DOM.adminPanel) {
                DOM.adminPanel.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        },

        // ============================================================
        // تحميل إحصائيات الإدارة
        // ============================================================
        async loadAdminStats() {
            try {
                // عدد الطلاب
                const { count: studentsCount, error: studentsError } = await supabaseClient
                    .from('users')
                    .select('id', { count: 'exact' })
                    .eq('role', 'student');
                
                if (studentsError) throw studentsError;
                if (DOM.totalStudents) DOM.totalStudents.textContent = studentsCount || 0;

                // عدد المدرسين
                const { count: teachersCount, error: teachersError } = await supabaseClient
                    .from('teachers')
                    .select('id', { count: 'exact' })
                    .eq('is_active', true);
                
                if (teachersError) throw teachersError;
                if (DOM.totalTeachers) DOM.totalTeachers.textContent = teachersCount || 0;

                // عدد الفصول
                const { count: classesCount, error: classesError } = await supabaseClient
                    .from('classes')
                    .select('id', { count: 'exact' })
                    .eq('is_active', true);
                
                if (classesError) throw classesError;
                if (DOM.totalClasses) DOM.totalClasses.textContent = classesCount || 0;

                // عدد المحاضرات
                const { count: lecturesCount, error: lecturesError } = await supabaseClient
                    .from('lectures')
                    .select('id', { count: 'exact' })
                    .eq('is_published', true);
                
                if (lecturesError) throw lecturesError;
                if (DOM.totalLectures) DOM.totalLectures.textContent = lecturesCount || 0;

                // جلب الطلاب مع تقدمهم (للإحصائيات)
                const { data: students, error: studentsListError } = await supabaseClient
                    .from('users')
                    .select(`
                        id, full_name, email,
                        student_classes:student_classes (
                            progress_percent,
                            class_id,
                            classes:class_id (name)
                        )
                    `)
                    .eq('role', 'student')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (studentsListError) throw studentsListError;

                this.renderStudentsProgress(students || []);

            } catch (error) {
                console.error('❌ فشل تحميل الإحصائيات:', error);
                Toast.error('❌ فشل تحميل الإحصائيات');
            }
        },

        // ============================================================
        // عرض تقدم الطلاب في لوحة الإدارة
        // ============================================================
        renderStudentsProgress(students) {
            const container = DOM.studentsProgressList;
            if (!container) return;
            
            if (students.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;color:var(--text-light);padding:1rem;">
                        <span style="font-size:2rem;display:block;">👨‍🎓</span>
                        <p>لا يوجد طلاب مسجلين</p>
                    </div>
                `;
                return;
            }

            let html = '';
            students.forEach(student => {
                const classes = student.student_classes || [];
                const avgProgress = classes.length > 0 
                    ? Math.round(classes.reduce((sum, c) => sum + (c.progress_percent || 0), 0) / classes.length)
                    : 0;
                
                // تحديد لون التقدم
                let progressColor = 'var(--danger)';
                if (avgProgress >= 80) progressColor = 'var(--success)';
                else if (avgProgress >= 50) progressColor = 'var(--warning)';
                else if (avgProgress >= 25) progressColor = 'var(--primary)';
                
                html += `
                    <div style="background:var(--bg);border-radius:10px;padding:0.6rem 0.8rem;margin-bottom:0.4rem;border:1px solid var(--border);">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="flex:1;min-width:0;">
                                <strong style="font-size:0.9rem;">${student.full_name || 'طالب'}</strong>
                                <div style="font-size:0.6rem;color:var(--text-light);">${student.email || ''}</div>
                                <div style="font-size:0.55rem;color:var(--text-light);">${classes.length} فصل</div>
                            </div>
                            <div style="text-align:left;">
                                <div style="font-weight:700;color:${progressColor};font-size:1.1rem;">${avgProgress}%</div>
                                <div style="font-size:0.5rem;color:var(--text-light);">المعدل</div>
                            </div>
                        </div>
                        <div class="progress-bar" style="margin-top:0.2rem;">
                            <div class="progress-fill" style="width:${avgProgress}%;background:${progressColor};"></div>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        },

        // ============================================================
        // التنقل بين الصفحات
        // ============================================================
        navigateTo(page) {
            // إخفاء جميع الصفحات
            document.querySelectorAll('[id^="page-"]').forEach(p => {
                p.style.display = 'none';
            });
            
            // إظهار الصفحة المطلوبة
            const target = document.getElementById('page-' + page);
            if (target) target.style.display = 'block';

            // تحديث التنقل السفلي
            document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.page === page);
            });

            // تحديث عنوان الصفحة
            const titles = {
                'teachers': 'المدرسين',
                'my-classes': 'فصولي الدراسية',
                'account': 'حسابي',
                'admin': 'لوحة الإدارة'
            };
            
            if (DOM.breadcrumb) {
                DOM.breadcrumb.textContent = titles[page] || 'الصفحة الرئيسية';
            }
            
            if (DOM.pageTitle) {
                DOM.pageTitle.textContent = titles[page] || 'الصفحة الرئيسية';
            }

            // تحديث الحالة
            state.currentPage = page;
            
            // إعادة عرض البيانات إذا لزم الأمر
            if (page === 'my-classes') Data.renderMyClasses();
            if (page === 'teachers') Data.renderTeachers();
            if (page === 'admin') this.openAdminPanel();

            // التمرير للأعلى
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        // ============================================================
        // إغلاق النوافذ المنبثقة
        // ============================================================
        closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        },

        // ============================================================
        // البحث عن مدرسين
        // ============================================================
        search() {
            const term = DOM.searchInput?.value?.trim() || '';
            
            // Rate limiting للبحث
            if (!Security.rateLimit('search', 'search', 10, 60000)) {
                return;
            }
            
            Data.renderTeachers(term);
        },

        // ============================================================
        // تصدير البيانات (للمشرف فقط)
        // ============================================================
        async exportData() {
            if (!state.isAdmin) {
                Toast.error('❌ غير مصرح لك');
                return;
            }

            try {
                Toast.info('⏳ جاري تصدير البيانات...');
                
                const data = {
                    teachers: state.teachers,
                    classes: state.classes,
                    grades: state.grades,
                    users: state.user,
                    exportedAt: new Date().toISOString()
                };
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dev_academy_backup_${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                Toast.success('✅ تم تصدير البيانات بنجاح');
                
            } catch (error) {
                console.error('❌ فشل تصدير البيانات:', error);
                Toast.error('❌ فشل تصدير البيانات');
            }
        },

        // ============================================================
        // تهيئة التطبيق
        // ============================================================
        async init() {
            console.log('🔒 بدء تشغيل ديف أكاديمي v5.0');
            console.log('🛡️ تطبيق الحماية...');
            
            // 1. تطبيق الحماية
            Security.protectDevTools();
            Security.protectXSS();
            Security.startInactivityTimer();

            // 2. استعادة الوضع المظلم
            const savedTheme = localStorage.getItem('devAcademicTheme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-mode');
                if (DOM.themeToggle) {
                    DOM.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                }
                state.theme = 'dark';
            }

            // 3. التحقق من الجلسة
            console.log('🔑 التحقق من الجلسة...');
            const hasSession = await Auth.checkSession();
            
            if (!hasSession) {
                const guest = Security.secureGet('devAcademicUser');
                if (guest?.guest) {
                    state.isGuest = true;
                    Toast.info('👋 مرحباً ضيف');
                } else {
                    // إذا كان المستخدم غير مسجل وليس ضيف، نوجه لتسجيل الدخول
                    window.location.href = 'index.html';
                    return;
                }
            }

            // 4. تحميل البيانات
            console.log('📊 تحميل البيانات...');
            await Data.loadAll();

            // 5. ربط الأحداث
            console.log('🔗 ربط الأحداث...');
            this.bindEvents();

            // 6. عرض اختصارات لوحة المفاتيح
            console.log('⌨️ اختصارات: Ctrl+K للبحث | Escape للإغلاق');
            console.log('🎓 ديف أكاديمي جاهز بالكامل ✅');
            
            // 7. تسجيل النشاط
            if (state.user) {
                Auth.logActivity('app_started', { version: '5.0' });
            }
            
            // 8. إظهار رسالة ترحيبية
            if (state.user) {
                const name = state.user.user_metadata?.full_name || 'مستخدم';
                Toast.success(`👋 مرحباً ${name}`);
            }
        },

        // ============================================================
        // ربط الأحداث
        // ============================================================
        bindEvents() {
            // ============================================================
            // تبديل الوضع المظلم
            // ============================================================
            if (DOM.themeToggle) {
                DOM.themeToggle.addEventListener('click', () => {
                    const isDark = document.body.classList.toggle('dark-mode');
                    DOM.themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                    localStorage.setItem('devAcademicTheme', isDark ? 'dark' : 'light');
                    state.theme = isDark ? 'dark' : 'light';
                });
            }

            // ============================================================
            // البحث (مع debounce)
            // ============================================================
            if (DOM.searchBtn) {
                DOM.searchBtn.addEventListener('click', () => this.search());
            }
            
            if (DOM.searchInput) {
                DOM.searchInput.addEventListener('keyup', (e) => {
                    if (e.key === 'Enter') {
                        this.search();
                    }
                    
                    // Debounce للبحث التلقائي
                    clearTimeout(state.searchTimeout);
                    state.searchTimeout = setTimeout(() => {
                        if (DOM.searchInput.value === '') {
                            Data.renderTeachers('');
                        }
                    }, 300);
                });

                // التركيز على البحث عند الضغط على /
                DOM.searchInput.addEventListener('keydown', (e) => {
                    if (e.key === '/' && e.ctrlKey) {
                        e.preventDefault();
                        DOM.searchInput.focus();
                        DOM.searchInput.select();
                    }
                });
            }

            // ============================================================
            // تسجيل الخروج
            // ============================================================
            if (DOM.logoutBtn) {
                DOM.logoutBtn.addEventListener('click', () => {
                    Toast.interactive(
                        '⚠️ هل أنت متأكد من تسجيل الخروج؟',
                        [
                            { label: 'نعم', callback: 'Auth.signOut()' },
                            { label: 'إلغاء', callback: 'Toast.success("تم الإلغاء")' }
                        ]
                    );
                });
            }

            // ============================================================
            // زر الملف الشخصي
            // ============================================================
            const profileBtn = document.getElementById('userProfileBtn');
            if (profileBtn) {
                profileBtn.addEventListener('click', () => {
                    if (!state.user) {
                        window.location.href = 'index.html';
                        return;
                    }
                    this.navigateTo('my-classes');
                });
            }

            // ============================================================
            // التنقل السفلي
            // ============================================================
            document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.navigateTo(item.dataset.page);
                });
            });

            // ============================================================
            // أزرار إغلاق النوافذ المنبثقة
            // ============================================================
            const closeModalButtons = [
                { id: 'closeTeacherClasses', modal: 'teacherClassesModal' },
                { id: 'closeClassStudents', modal: 'classStudentsModal' },
                { id: 'closeStudentProgress', modal: 'studentProgressModal' }
            ];
            
            closeModalButtons.forEach(({ id, modal }) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('click', () => {
                        this.closeModal(modal);
                    });
                }
            });

            // ============================================================
            // إغلاق النوافذ عند الضغط على الخلفية
            // ============================================================
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.addEventListener('click', function(e) {
                    if (e.target === this) {
                        this.classList.remove('active');
                        document.body.style.overflow = 'auto';
                    }
                });
            });

            // ============================================================
            // اختصارات لوحة المفاتيح العالمية
            // ============================================================
            document.addEventListener('keydown', (e) => {
                // Escape: إغلاق جميع النوافذ المنبثقة
                if (e.key === 'Escape') {
                    document.querySelectorAll('.modal-overlay.active').forEach(m => {
                        m.classList.remove('active');
                        document.body.style.overflow = 'auto';
                    });
                    
                    // إغلاق لوحة الإدارة
                    if (DOM.adminPanel && DOM.adminPanel.classList.contains('active')) {
                        this.closeAdminPanel();
                    }
                }
                
                // Ctrl+K: التركيز على البحث
                if (e.ctrlKey && e.key === 'k') {
                    e.preventDefault();
                    if (DOM.searchInput) {
                        DOM.searchInput.focus();
                        DOM.searchInput.select();
                    }
                }

                // Ctrl+R: تحديث البيانات
                if (e.ctrlKey && e.key === 'r') {
                    e.preventDefault();
                    Data.refresh();
                }

                // Ctrl+Shift+D: تصدير البيانات (للمشرف فقط)
                if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    this.exportData();
                }
            });

            // ============================================================
            // مراقبة حالة الاتصال
            // ============================================================
            window.addEventListener('online', () => {
                state.connectionStatus = true;
                Toast.success('✅ عاد الاتصال بالإنترنت');
                Data.refresh();
            });

            window.addEventListener('offline', () => {
                state.connectionStatus = false;
                Toast.warning('⚠️ انقطع الاتصال بالإنترنت');
            });

            // ============================================================
            // حفظ حالة التطبيق عند الإغلاق
            // ============================================================
            window.addEventListener('beforeunload', () => {
                if (state.user) {
                    Auth.logActivity('app_closed', {});
                }
            });

            console.log('✅ تم ربط جميع الأحداث');
        }
    };

    // ============================================================
    // 9) EXPOSE TO WINDOW - جعل الدوال عامة
    // ============================================================

    window.App = App;
    window.Data = Data;
    window.Auth = Auth;
    window.Toast = Toast;
    window.Security = Security;
    window.state = state;

    // ============================================================
    // 10) START - تشغيل التطبيق
    // ============================================================

    // التأكد من تحميل DOM بالكامل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            App.init().catch(error => {
                console.error('❌ فشل تشغيل التطبيق:', error);
                Toast.error('❌ حدث خطأ في تحميل المنصة');
            });
        });
    } else {
        // DOM جاهز بالفعل
        setTimeout(() => {
            App.init().catch(error => {
                console.error('❌ فشل تشغيل التطبيق:', error);
                Toast.error('❌ حدث خطأ في تحميل المنصة');
            });
        }, 100);
    }

    // ============================================================
    // نهاية الملف - شكراً لاستخدامك ديف أكاديمي 🎓
    // ============================================================

})();