// =======================
// استيراد المكتبات
// =======================
const express = require('express');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const crypto = require('crypto'); // مكتبة لتوليد التوكنات العشوائية
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

// =======================
// إعداد التطبيق
// =======================
const app = express();
const server = require('http').createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

app.use(cors()); // نقل مديول CORS للأعلى لضمان عمله مع كل الطلبات
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(express.json());
// --- إضافة Headers لحل مشكلة Cross-Origin-Opener-Policy مع جوجل ---
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =======================
// إعداد الاتصال بقاعدة البيانات
// =======================
// تم نقل منطق الاتصال لأسفل الملف لضمان الترتيب الصحيح للتشغيل

// =======================
// إعداد Cloudinary
// =======================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// =======================
// إعداد رفع الملفات
// =======================
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// =======================
// نماذج قاعدة البيانات
// =======================

// --- نموذج المستخدمين ---
const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['client', 'developer', 'admin', 'teacher', 'student'] },
    grade: { type: String },
    group: { type: String },
    teacherId: { type: String },
    responsibleForGroup: { type: String },
    createdAt: { type: Date, default: Date.now }, // حقل لتاريخ إنشاء الحساب
    isVerified: { type: Boolean, default: false }, // هل الحساب مفعل؟
    verificationToken: { type: String }, // توكن التفعيل
    resetPasswordToken: { type: String }, // توكن استعادة كلمة المرور
    resetPasswordExpires: { type: Date }, // تاريخ انتهاء صلاحية توكن الاستعادة
    lastLogin: { type: Date }, // جديد: حقل لتسجيل آخر دخول
    schedule: [{
        day: String,
        time: String,
        teacher: String,
        plan: String,
        // --- الحقول الجديدة للجلسات ---
        sessionLink: { type: String, default: null },
        sessionActive: { type: Boolean, default: false }
    }],
    attendance: [{
        date: String,
        status: String
    }]
});
const User = mongoose.model('User', userSchema);

// --- نموذج الشرائح الإعلانية ---
const slideSchema = new mongoose.Schema({
    title: { type: String, required: false }, // جعل العنوان اختيارياً
    text: { type: String, required: false },  // جعل النص اختيارياً
    imageUrl: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
});
const Slide = mongoose.model('Slide', slideSchema);

// --- نموذج الطلبات (Order Schema) ---
const orderSchema = new mongoose.Schema({
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    serviceType: { type: String, required: true }, // نوع الخدمة: ويب، موبايل، تصميم...
    description: { type: String, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'in-progress', 'completed', 'cancelled'] },
    price: { type: String, default: 'بانتظار التحديد' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// --- نموذج المقالات ---
const articleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const Article = mongoose.model('Article', articleSchema);

// --- نموذج المشاريع (Portfolio Schema) ---
const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true }, // ويب، موبايل، الخ..
    description: { type: String },
    imageUrl: { type: String },
    link: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', projectSchema);

// =======================
// دالة لإنشاء حساب المدير الافتراضي
// =======================
async function createDefaultAdminIfNeeded() {
    try {
        // --- التصحيح: التحقق من وجود كل حساب مدير على حدة ---

        // 1. التحقق من وجود المدير العام أو ترقية حسابه إذا وجد
        const generalAdminExists = await User.findOne({ id: 'aseralnjjar@gmail.com' });
        if (!generalAdminExists) {
            const defaultAdmin = new User({
                id: 'aseralnjjar@gmail.com',
                name: 'المدير العام',
                password: 'admin_password_here', // يمكنك تغييرها للدخول اليدوي
                role: 'admin'
            });
            await defaultAdmin.save();
            console.log('✅ تم إنشاء حساب المدير العام الافتراضي.');
        }

        // 2. التحقق من وجود مراقب النظام (المدير الخفي)
        const monitorAdminExists = await User.findOne({ id: '12121212' });
        if (monitorAdminExists) await User.deleteOne({ id: '12121212' }); // حذف الحساب إن كان موجوداً
    } catch (error) {
        console.error('❌ فشل في إنشاء حسابات المدراء الافتراضية:', error);
    }
}

// =======================
// المسارات (Routes)
// =======================

// كائن توجيه الصفحات
const getRedirectPage = (role) => {
    const pages = { 
        client: 'client-dashboard.html', 
        admin: 'admin-dashboard.html',
        teacher: 'teacher-dashboard.html',
        student: 'student-dashboard.html'
    };
    return pages[role] || 'index.html';
};

// --- مسارات المستخدمين وتسجيل الدخول ---
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        if (!token) return res.status(400).json({ message: 'التوكن مفقود' });
        
        console.log("🔍 محاولة التحقق من التوكن باستخدام Client ID:", process.env.GOOGLE_CLIENT_ID);
        
        if (!process.env.GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is missing in environment variables");
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const email = payload.email;

        const isAdminEmail = email === 'aseralnjjar@gmail.com';
        let user = await User.findOne({ id: email });

        // حالة 1: مستخدم جديد (تسجيل لأول مرة)
        if (!user) {
            user = new User({
                id: email,
                name: payload.name,
                password: 'google_auth_placeholder', // كلمة مرور مؤقتة
                role: isAdminEmail ? 'admin' : 'client',
                isVerified: true // حسابات جوجل مفعلة تلقائياً
            });
            await user.save();
            // نرسل إشارة للفرونت إند أن هذا مستخدم جديد ليتم توجيهه لصفحة تعيين كلمة المرور
            return res.json({ isNew: true, email: email });
        } 
        
        // حالة 2: مستخدم موجود
        if (isAdminEmail && user.role !== 'admin') {
            // ترقية الحساب إذا كان مسجلاً مسبقاً كعميل
            user.role = 'admin';
        }

        await user.save();

        res.json({ user, redirectTo: getRedirectPage(user.role) });
    } catch (error) {
        console.error('❌ Google Auth Full Error:', error);
        res.status(401).json({ message: 'فشل التحقق من حساب جوجل: ' + error.message });
    }
});

// --- مسار جديد: إكمال الملف الشخصي (تعيين كلمة المرور لمستخدمي جوجل) ---
app.post('/api/auth/complete-profile', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ id: email });
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

        user.password = password; // تحديث كلمة المرور
        await user.save();

        res.json({ message: 'تم تحديث البيانات', user, redirectTo: getRedirectPage(user.role) });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء الحفظ' });
    }
});

app.post('/api/login', async (req, res) => {
    const { id, password } = req.body;
    
    // البحث عن المستخدم (id هنا هو الإيميل)
    const user = await User.findOne({ id: id.toLowerCase() }); // تحويل لحروف صغيرة للمطابقة

    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود.' });
    if (user.password !== password) return res.status(401).json({ message: 'كلمة المرور غير صحيحة.' });

    // --- التحقق من تفعيل الحساب ---
    // ملاحظة: المدراء والمعلمين القدامى قد لا يكون لديهم تفعيل، لذا نتخطى الشرط إذا لم يكن لديهم توكن أصلاً أو إذا كان الحساب قديماً
    if (user.role === 'client' && user.isVerified === false) {
         return res.status(403).json({ message: 'يرجى تفعيل حسابك أولاً من خلال الرابط المرسل لبريدك الإلكتروني.' });
    }

    // --- جديد: تحديث تاريخ آخر تسجيل دخول ---
    user.lastLogin = new Date();
    await user.save();

    res.json({ message: 'تم تسجيل الدخول بنجاح', user: user, redirectTo: getRedirectPage(user.role) });
});

// --- تعديل مسار التسجيل لإرسال إيميل التفعيل ---
app.post('/api/users', async (req, res) => {
    try {
        const { name, id, password, role } = req.body;
        
        // توليد توكن تفعيل
        const token = crypto.randomBytes(32).toString('hex');

        const newUser = new User({
            name,
            id: id.toLowerCase(),
            password,
            role,
            isVerified: false, // الحساب غير مفعل افتراضياً
            verificationToken: token
        });

        await newUser.save();

        // إرسال بريد التفعيل
        const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email.html?token=${token}`;
        
        // استخدام إعدادات Nodemailer الموجودة
        await sendEmailInternal(
            id,
            'تفعيل حسابك في Web Craft',
            `أهلاً ${name}،\n\nشكراً لتسجيلك معنا. يرجى الضغط على الرابط التالي لتفعيل حسابك:\n\n${verifyUrl}\n\nهذا الرابط صالح لمدة 24 ساعة.`
        );

        res.status(201).json(newUser);
    } catch (error) {
        // --- تحسين الـ Log لمعرفة سبب خطأ الإيميل ---
        console.error("❌ Signup Error Details:", error); 
        if (error.code === 11000) return res.status(400).json({ message: 'رقم العضوية مستخدم بالفعل.' });
        // إرجاع رسالة الخطأ الأصلية إذا كانت المشكلة من الإيميل
        res.status(500).json({ message: 'حدث خطأ أثناء إرسال البريد: ' + (error.message || 'خطأ غير معروف') });
    }
});

app.get('/api/users/all', async (req, res) => {
    const users = await User.find();
    res.json(users);
});

// --- مسار تفعيل البريد الإلكتروني (عند الضغط على الرابط) ---
app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findOne({ verificationToken: token });

        if (!user) return res.status(400).json({ message: 'رابط التفعيل غير صالح أو منتهي الصلاحية.' });

        user.isVerified = true;
        user.verificationToken = undefined; // حذف التوكن بعد الاستخدام
        await user.save();

        res.json({ message: 'تم تفعيل الحساب بنجاح! يمكنك الآن تسجيل الدخول.' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء التفعيل.' });
    }
});

// --- مسار طلب استعادة كلمة المرور (Forgot Password) ---
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ id: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: 'البريد الإلكتروني غير مسجل لدينا.' });

        // توليد توكن الاستعادة
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // صلاحية لمدة ساعة واحدة
        await user.save();

        // رابط إعادة التعيين (يوجه لصفحة Frontend)
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${token}`;

        await sendEmailInternal(
            user.id,
            'استعادة كلمة المرور - Web Craft',
            `لقد تلقينا طلباً لاستعادة كلمة المرور الخاصة بحسابك.\n\nاضغط على الرابط التالي لإنشاء كلمة مرور جديدة:\n\n${resetUrl}\n\nإذا لم تطلب هذا، يرجى تجاهل الرسالة.`
        );

        res.json({ message: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.' });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        // تحسين عرض الخطأ: إذا كانت المشكلة في الاتصال بجوجل
        const msg = error.message.includes('Missing') ? error.message : 'فشل إرسال البريد: تأكد من إعدادات SMTP في Render.';
        res.status(500).json({ message: msg + ' (' + (error.code || '') + ')' });
    }
});

// --- مسار تعيين كلمة المرور الجديدة (Reset Password) ---
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } // التأكد أن الوقت لم ينتهِ
        });

        if (!user) return res.status(400).json({ message: 'الرابط غير صالح أو انتهت صلاحيته.' });

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء تغيير كلمة المرور.' });
    }
});

// --- دالة مساعدة داخلية لإرسال الإيميل ---
async function sendEmailInternal(to, subject, text) {
    // التحقق من وجود المتغيرات قبل المحاولة
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('⚠️ خطأ حرج: لم يتم إضافة إيميل المرسل أو كلمة المرور في إعدادات Render (Environment Variables).');
    }

    // التحقق مما إذا كان البريد هو جيميل لاستخدام الإعدادات التلقائية
    const isGmail = process.env.SMTP_USER && process.env.SMTP_USER.includes('@gmail.com');

    const transporter = nodemailer.createTransport({
        // إذا كان جيميل، نستخدم الخدمة الجاهزة (service: 'gmail')
        service: isGmail ? 'gmail' : undefined,
        host: isGmail ? undefined : process.env.SMTP_HOST,
        port: isGmail ? undefined : parseInt(process.env.SMTP_PORT || '587', 10),
        secure: isGmail ? undefined : (process.env.SMTP_SECURE === 'true'),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS, // هنا نضع "كلمة مرور التطبيق" الـ 16 حرف
        },
    });

    await transporter.sendMail({
        // تصحيح هام: يجب أن يكون "From" مطابقاً تماماً للمستخدم المصادق عليه في Gmail لتجنب الأخطاء
        from: `"Web Craft Security" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        text: text,
        html: `<div style="font-family: 'Tajawal', sans-serif; text-align: right; direction: rtl; padding: 20px; background-color: #f4f4f4;">
                <div style="background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #8b5cf6;">Web Craft</h2>
                    <p style="white-space: pre-wrap; font-size: 16px; color: #333;">${text.replace(/\n/g, '<br>')}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #777;">إذا لم تقم بهذا الطلب، يمكنك تجاهل هذا البريد بأمان.</p>
                </div>
               </div>`
    });
}

app.get('/api/teacher/students', async (req, res) => {
    const { teacherId } = req.query;
    const students = await User.find({ role: 'student', teacherId: teacherId });
    res.json(students);
});

// --- مسار مؤقت: تصفير جميع المستخدمين (حذف الكل) ---
// تنبيه: استخدم هذا الرابط مرة واحدة ثم احذف الكود للامان
app.delete('/api/debug/reset-all-users', async (req, res) => {
    try {
        await User.deleteMany({}); // حذف كل المستخدمين بلا استثناء
        await createDefaultAdminIfNeeded(); // إعادة إنشاء المدير العام الافتراضي فوراً
        console.log('⚠️ تم تصفير قاعدة البيانات وحذف جميع المستخدمين.');
        res.json({ message: 'تم حذف جميع المستخدمين بنجاح وإعادة ضبط النظام.' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء التصفير.' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findOne({ id: req.params.id });
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود.' });

        // --- تعديل: منع حذف حساب المدير العام فقط ---
        const protectedIds = ['aseralnjjar@gmail.com'];
        if (protectedIds.includes(user.id)) {
            return res.status(400).json({ message: 'لا يمكن حذف المدير الأصلي للنظام.' });
        }

        // منطق جديد: السماح بحذف الأدمن بشرط وجود أدمن آخر على الأقل
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'لا يمكن حذف آخر مدير في النظام.' });
            }
        }

        await User.deleteOne({ id: req.params.id });
        res.json({ message: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء الحذف.' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params; // هذا الآن هو _id من قاعدة البيانات
        const { name, role, password, grade, group, teacherId, responsibleForGroup } = req.body;

        const user = await User.findById(id); // التعديل: البحث باستخدام findById
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود.' });

        user.name = name || user.name;
        user.role = role || user.role;
        if (password) {
            user.password = password; // في تطبيق حقيقي، يجب تشفير كلمة المرور هنا
        }
        user.grade = grade || null;
        user.group = group || null;
        user.teacherId = teacherId || null;
        user.responsibleForGroup = responsibleForGroup || null;

        await user.save();
        res.json({ message: 'تم تحديث بيانات المستخدم بنجاح', user: user });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء تحديث المستخدم.' });
    }
});

// --- مسارات الجداول الدراسية ---
app.get('/api/schedule/:studentId', async (req, res) => {
    const user = await User.findOne({ id: req.params.studentId });
    if (!user) return res.status(404).json({ message: 'الطالب غير موجود' });
    res.json({ name: user.name, schedule: user.schedule });
});

app.put('/api/schedule/:studentId', async (req, res) => {
    const { schedule } = req.body;
    await User.updateOne({ id: req.params.studentId }, { $set: { schedule: schedule } });
    res.json({ message: 'تم تحديث الجدول بنجاح' });
});

// --- مسار جديد: تحديث رابط جلسة لطالب ---
app.put('/api/session/:studentId', async (req, res) => {
    const { sessionLink, sessionActive } = req.body;
    try {
        // نستخدم findOneAndUpdate للعثور على الطالب وتحديث بياناته
        const updatedUser = await User.findOneAndUpdate(
            { id: req.params.studentId },
            // --- التصحيح: استخدام $set لتحديث الحقول مباشرة ---
            // هذا الكود يفترض أن الطالب لديه حلقة واحدة فقط، وهو ما يتناسب مع تصميمنا الحالي
            { $set: { "schedule.0.sessionLink": sessionLink, "schedule.0.sessionActive": sessionActive } },
            { new: true } // هذا الخيار يعيد المستند المحدّث
        );

        if (!updatedUser) return res.status(404).json({ message: 'الطالب غير موجود' });

        res.json({ message: 'تم تحديث رابط الجلسة بنجاح', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// =======================
// مسارات نظام الطلبات (WEB CRAFT)
// =======================

// 1. إنشاء طلب جديد (للعميل)
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.status(201).json({ message: 'تم إرسال طلبك بنجاح', order: newOrder });
    } catch (error) {
        res.status(500).json({ message: 'فشل إنشاء الطلب' });
    }
});

// 2. جلب طلبات عميل معين (للعميل)
app.get('/api/orders/client/:clientId', async (req, res) => {
    try {
        const orders = await Order.find({ clientId: req.params.clientId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الطلبات' });
    }
});

// 3. جلب كل الطلبات (للأدمن)
app.get('/api/orders/all', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الطلبات' });
    }
});

// 4. تحديث حالة الطلب (للأدمن)
app.put('/api/orders/:id', async (req, res) => {
    try {
        const { status, price } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, 
            { status, price }, 
            { new: true }
        );
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'فشل تحديث الطلب' });
    }
});

// --- مسارات المشاريع (Portfolio) ---
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب المشاريع' });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const newProject = new Project(req.body);
        await newProject.save();
        res.status(201).json(newProject);
    } catch (error) {
        res.status(400).json({ message: 'فشلت إضافة المشروع' });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف المشروع' });
});

// --- مسارات الحضور والغياب ---
app.post('/api/attendance', async (req, res) => {
    const { date, records } = req.body;
    try {
        for (const record of records) {
            await User.updateOne(
                { id: record.studentId },
                { $pull: { attendance: { date: date } } }
            );
            await User.updateOne(
                { id: record.studentId },
                { $push: { attendance: { date: date, status: record.status } } }
            );
        }
        res.status(200).json({ message: 'تم تسجيل الحضور بنجاح' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// --- مسار جديد: جلب سجل حضور طالب معين ---
app.get('/api/attendance/:studentId', async (req, res) => {
    const user = await User.findOne({ id: req.params.studentId });
    if (!user) return res.status(404).json({ message: 'الطالب غير موجود' });
    // نرسل اسم الطالب وسجل الحضور الخاص به فقط
    res.json({ name: user.name, attendance: user.attendance });
});

// --- مسارات السلايدر الإعلاني ---
app.get('/api/slides', async (req, res) => {
    try {
        const slides = await Slide.find({ isActive: true }).sort({ order: 'asc' });
        res.json(slides);
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

app.get('/api/slides/all', async (req, res) => {
    try {
        const slides = await Slide.find().sort({ order: 'asc' });
        res.json(slides);
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// =======================
// نموذج التعليقات: إرسال بريد للإدارة
// =======================
app.post('/api/comments', async (req, res) => {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'الرجاء إدخال الاسم والبريد والتعليق.' });
    }
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const toAddress = process.env.EMAIL_TO || process.env.SMTP_USER;
        await transporter.sendMail({
            from: `QURAN Platform <${process.env.SMTP_USER}>`,
            to: toAddress,
            replyTo: email,
            subject: 'تعليق جديد من الموقع',
            text: `الاسم: ${name}\nالبريد: ${email}\n\nالتعليق:\n${message}`,
            html: `<p><strong>الاسم:</strong> ${name}</p>
                   <p><strong>البريد:</strong> ${email}</p>
                   <p><strong>التعليق:</strong></p>
                   <p style="white-space: pre-wrap;">${message}</p>`
        });
        res.json({ message: 'تم إرسال التعليق بنجاح.' });
    } catch (error) {
        console.error('Mail error:', error);
        res.status(500).json({ message: 'فشل إرسال البريد. تأكد من إعدادات البريد.' });
    }
});

app.post('/api/slides', upload.single('imageFile'), async (req, res) => {
    try {
        let imageUrl = '';
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, { folder: "quran_slides" });
            imageUrl = result.secure_url;
        } else {
            return res.status(400).json({ message: 'الرجاء رفع ملف صورة.' });
        }
        const newSlide = new Slide({ ...req.body, imageUrl: imageUrl });
        await newSlide.save();
        res.status(201).json(newSlide);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'فشلت إضافة الشريحة بسبب خطأ في الخادم' });
    }
});

app.put('/api/slides/:id', upload.single('imageFile'), async (req, res) => {
    try {
        const slideToUpdate = await Slide.findById(req.params.id);
        if (!slideToUpdate) return res.status(404).json({ message: 'الشريحة غير موجودة' });
        let imageUrl = slideToUpdate.imageUrl;
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, { folder: "quran_slides" });
            imageUrl = result.secure_url;
        }
        const updatedData = { ...req.body, imageUrl: imageUrl };
        const updatedSlide = await Slide.findByIdAndUpdate(req.params.id, updatedData, { new: true });
        res.json(updatedSlide);
    } catch (error) {
        res.status(500).json({ message: 'فشل تعديل الشريحة' });
    }
});

app.delete('/api/slides/:id', async (req, res) => {
    await Slide.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف الشريحة بنجاح' });
});

// --- مسارات المقالات (تمت إعادتها) ---
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب المقالات' });
    }
});

app.get('/api/articles/:id', async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ message: 'المقال غير موجود' });
        res.json(article);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
});

app.post('/api/articles', async (req, res) => {
    try {
        const { title, content } = req.body;
        const excerpt = content.split(' ').slice(0, 25).join(' ') + '...';
        const newArticle = new Article({ title, content, excerpt });
        await newArticle.save();
        res.status(201).json(newArticle);
    } catch (error) {
        res.status(400).json({ message: 'فشلت إضافة المقال' });
    }
});

app.put('/api/articles/:id', async (req, res) => {
    try {
        const { title, content } = req.body;
        const excerpt = content.split(' ').slice(0, 25).join(' ') + '...';
        const updatedArticle = await Article.findByIdAndUpdate(req.params.id, { title, content, excerpt }, { new: true });
        res.json(updatedArticle);
    } catch (error) {
        res.status(400).json({ message: 'فشل تحديث المقال' });
    }
});

app.delete('/api/articles/:id', async (req, res) => {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف المقال بنجاح' });
});
// =======================
// منطق Socket.IO
// =======================
const userSockets = {};

async function computeStats() {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const totalClients = await User.countDocuments({ role: 'student' }); 
    
    return { totalOrders, pendingOrders, completedOrders, totalClients };
}

async function broadcastStats() {
    try {
        const stats = await computeStats();
        io.emit('stats_update', stats);
    } catch (e) {
        console.error('Failed to broadcast stats', e);
    }
}
io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);
    socket.on('register_user', async (userId) => {
        userSockets[userId] = socket.id;
        console.log(`User ${userId} registered with socket ${socket.id}`);
        await broadcastStats();
    });
    socket.on('send_link_to_students', (data) => {
        data.studentIds.forEach(studentId => {
            const studentSocketId = userSockets[studentId];
            if (studentSocketId) {
                io.to(studentSocketId).emit('session_link_update', { link: data.link });
            }
        });
    });
    socket.on('disconnect', () => {
        for (const userId in userSockets) {
            if (userSockets[userId] === socket.id) {
                delete userSockets[userId];
                break;
            }
        }
        console.log('user disconnected');
        broadcastStats();
    });
});

// =======================
// إحصائيات عامة للوحة الأدمن
// =======================
app.get('/api/stats/overview', async (req, res) => {
    try {
        const stats = await computeStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'فشل جلب الإحصائيات.' });
    }
});

// =======================
// تشغيل الخادم
// =======================
const PORT = process.env.PORT || 10000;

// --- نظام تشغيل السيرفر المعتمد على حالة قاعدة البيانات ---
async function startServer() {
    try {
        // 1. الاتصال بقاعدة البيانات والانتظار
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // المحاولة لمدة 5 ثوانٍ فقط قبل إظهار الخطأ
            connectTimeoutMS: 10000,
        });
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

        // التحقق من إعدادات البريد وطباعة رسالة تأكيد
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log(`✅ خدمة البريد الإلكتروني مفعلة للحساب: ${process.env.SMTP_USER}`);
        } else {
            console.warn('⚠️ تنبيه: إعدادات البريد الإلكتروني (SMTP) مفقودة.');
        }

        // 2. إنشاء حسابات المدراء إذا لم تكن موجودة
        await createDefaultAdminIfNeeded();

        // 3. بدء استقبال الطلبات
        server.listen(PORT, () => {
            console.log(`✅ الخادم يعمل الآن على المنفذ ${PORT}`);
        });
    } catch (err) {
        console.error("❌ فشل حاسم أثناء بدء تشغيل الخادم:", err);
        process.exit(1); // إغلاق العملية في حالة الفشل التام
    }
}

startServer();

// =======================
// مهمة مجدولة لحذف الحسابات غير النشطة
// =======================
async function deleteInactiveUsers() {
    try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        
        // البحث عن الطلاب الذين تم إنشاؤهم منذ أكثر من يومين
        // وليس لديهم معلم أو مجموعة (أي غير مشتركين)
        const result = await User.deleteMany({
            role: 'student',
            createdAt: { $lt: twoDaysAgo },
            teacherId: { $in: [null, ''] }, // التصحيح: البحث عن الطلاب غير المرتبطين بمعلم
            group: { $in: [null, ''] }      // التصحيح: البحث عن الطلاب غير المنضمين لمجموعة
        });
        if (result.deletedCount > 0) console.log(`✅ تم حذف ${result.deletedCount} من الطلاب غير النشطين.`);
    } catch (error) { console.error('❌ فشلت مهمة حذف المستخدمين غير النشطين:', error); }
}
setInterval(deleteInactiveUsers, 24 * 60 * 60 * 1000); // تشغيل المهمة مرة كل 24 ساعة
