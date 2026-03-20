# Web Craft Platform 🚀

منصة احترافية لتقديم الحلول البرمجية وتطوير الويب، تعتمد على بنية برمجية حديثة وآمنة.

## 🌟 المميزات الرئيسية
- **تسجيل الدخول بجوجل:** تجربة دخول سريعة وآمنة للمستخدمين.
- **لوحات تحكم متعددة الأدوار:** (Admin, Client, Developer, Teacher, Student).
- **نظام طلبات متكامل:** إدارة كاملة لطلبات العملاء وتحديث حالاتها.
- **تصميم فخم (Dark Mode):** واجهة مستخدم عصرية تعتمد على تقنيات الـ Glassmorphism.
- **تأثيرات بصرية:** Matrix effect وتأثيرات تحريك عند التمرير.
- **باك-أند قوي:** مبني باستخدام Node.js و Express مع قاعدة بيانات MongoDB.

## 🛠 التقنيات المستخدمة
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla), Bootstrap 5.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB Atlas (Mongoose).
- **Real-time:** Socket.io.
- **Cloud Services:** Cloudinary (Images), Google OAuth 2.0.

## ⚙️ إعدادات البيئة (Environment Variables)
عند رفع المشروع على Render، يجب إضافة المتغيرات التالية في قسم "Environment" في لوحة تحكم Render.

**ملاحظة هامة:** لا تشارك هذه المفاتيح أبداً بشكل عام. لقد تم استبدال القيم الحساسة بقيم وهمية للحفاظ على أمان المشروع.
```text
# MongoDB Connection (استبدل بالبيانات الحقيقية الخاصة بك)
MONGO_URI=mongodb+srv://<username>:<password>@<your-cluster-url>

# Google OAuth 2.0 (موجود في ملف login.js)
GOOGLE_CLIENT_ID=377747466694-ov9o47r36odfd7j0mn4di0rldu08fc8g.apps.googleusercontent.com

# Cloudinary for Image Uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Nodemailer for Sending Emails
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email_address
SMTP_PASS=your_email_password
EMAIL_TO=email_address_to_receive_messages
```

## 🚀 التشغيل المحلي
1. قم بتحميل الملفات.
2. نفذ الأمر `npm install` لتثبيت المكتبات.
3. نفذ الأمر `node server.js` لتشغيل الخادم.

---
© 2024 Web Craft Solutions.