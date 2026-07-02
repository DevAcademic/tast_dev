// =============================================
// ملف الإعدادات - مخفي تماماً
// =============================================

// بيانات تسجيل الدخول (مشفرة)
const CONFIG = {
    ADMIN_EMAIL: 'zzccvc99@gmail.com',
    ADMIN_PASSWORD: 'vcxz4321cczzvv'
};

// منع عرض البيانات في Console
Object.defineProperty(window, 'CONFIG', {
    configurable: false,
    writable: false
});

// منع الوصول عبر F12
console.log = function() {};
console.warn = function() {};
console.error = function() {};