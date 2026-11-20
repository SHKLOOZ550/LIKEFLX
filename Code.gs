// Google Apps Script: يستقبل أحداث استخدام النموذج التجريبي فقط ويرسل ملخصاً إلى Telegram.
// لا تستقبل هذه الخدمة رقم بطاقة أو CVV أو OTP، ولا تضف حقولاً من هذا النوع إلى الرسائل.
// في Project Settings > Script Properties أضف:
// TELEGRAM_BOT_TOKEN = رمز البوت
// TELEGRAM_CHAT_ID = رقم محادثتك أو المجموعة

function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var allowed = [
      "plan_selected",
      "demo_payment_fields_completed",
      "demo_verification_completed",
      "survey_submitted"
    ];
    if (allowed.indexOf(String(p.event || "")) === -1) {
      return ContentService.createTextOutput("ignored");
    }

    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty("TELEGRAM_BOT_TOKEN");
    var chatId = props.getProperty("TELEGRAM_CHAT_ID");
    if (!token || !chatId) throw new Error("Missing Telegram configuration");

    var eventNames = {
      plan_selected: "اختار باقة",
      demo_payment_fields_completed: "أكمل حقول الدفع التجريبية",
      demo_verification_completed: "أكمل رمز التحقق التجريبي",
      survey_submitted: "أرسل الاستبيان"
    };

    var lines = [
      "📊 نشاط جديد في نموذج الاشتراك التجريبي",
      "الحدث: " + eventNames[p.event],
      "الباقة: " + safe_(p.plan, 40),
      "السعر الافتراضي: " + safe_(p.price, 20),
      "الجهاز: " + safe_(p.device, 20),
      "اللغة: " + safe_(p.language, 20),
      "المدة منذ بدء التجربة: " + safe_(p.elapsedSeconds, 10) + " ثانية"
    ];

    if (p.paymentStageSeconds) lines.push("مدة مرحلة الدفع التجريبية: " + safe_(p.paymentStageSeconds, 10) + " ثانية");
    if (p.ease) lines.push("سهولة الخطوات: " + safe_(p.ease, 40));
    if (p.barrier) lines.push("العائق المحتمل: " + safe_(p.barrier, 100));
    if (p.feedback) lines.push("ملاحظات: " + safe_(p.feedback, 700));

    var response = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "post",
      payload: { chat_id: chatId, text: lines.join("\n") },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
      throw new Error("Telegram API returned " + response.getResponseCode());
    }
    return ContentService.createTextOutput("ok");
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput("error");
  }
}

function safe_(v, max) {
  return String(v || "غير متاح").replace(/[<>]/g, "").trim().slice(0, max);
}
