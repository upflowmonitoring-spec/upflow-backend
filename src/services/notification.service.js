const axios = require("axios");
const AppError = require("../utils/AppError");

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (!BREVO_API_KEY) {
    console.warn("BREVO_API_KEY is not configured.");
}

if (!EMAIL_FROM) {
    console.warn("EMAIL_FROM is not configured.");
}

const getSender = () => ({
    name: "Uvix",
    email: EMAIL_FROM.includes("<")
        ? EMAIL_FROM.match(/<(.*)>/)?.[1]
        : EMAIL_FROM
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender: getSender(),
                to: [{ email: to }],
                subject,
                htmlContent: html
            },
            {
                headers: {
                    "api-key": BREVO_API_KEY,
                    "Content-Type": "application/json",
                    accept: "application/json"
                },
                timeout: 10000
            }
        );
    } catch (error) {
        console.error(
            "BREVO EMAIL ERROR:",
            error.response?.data || error.message
        );

        throw new AppError("Failed to send email", 500);
    }
};

// ==============================
// OTP EMAIL
// ==============================
const sendOtpEmail = async (email, otp) => {
    await sendEmail({
        to: email,
        subject: "Your Uvix Verification Code",
        html: `
        <div style="font-family:Arial,sans-serif;padding:30px;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px">
            <h2 style="color:#2563eb;">Welcome to U</h2>

            <p>Your verification code is:</p>

            <h1 style="font-size:42px;letter-spacing:8px;color:#111827;">
                ${otp}
            </h1>

            <p>This code will expire in <b>10 minutes</b>.</p>

            <hr style="margin:25px 0">

            <small style="color:#6b7280;">
                If you didn't request this verification code, you can safely ignore this email.
            </small>
        </div>
        `
    });

    console.log(`OTP email sent to ${email}`);
};

// ==============================
// INCIDENT OPENED
// ==============================
const sendIncidentOpenedEmail = async (email, monitorName) => {
    await sendEmail({
        to: email,
        subject: `${monitorName} is DOWN`,
        html: `
        <div style="font-family:Arial,sans-serif;padding:30px;max-width:600px;margin:auto;border:1px solid #ef4444;border-radius:12px">

            <h2 style="color:#dc2626;">
                 Monitor Down
            </h2>

            <p>
                Your monitor
                <strong>${monitorName}</strong>
                is currently unavailable.
            </p>

            <p>
                Please investigate the issue as soon as possible.
            </p>

        </div>
        `
    });

    console.log(`Incident email sent to ${email}`);
};

// ==============================
// INCIDENT RESOLVED
// ==============================
const sendIncidentResolvedEmail = async (email, monitorName) => {
    await sendEmail({
        to: email,
        subject: `${monitorName} has recovered`,
        html: `
        <div style="font-family:Arial,sans-serif;padding:30px;max-width:600px;margin:auto;border:1px solid #22c55e;border-radius:12px">

            <h2 style="color:#16a34a;">
                Monitor Recovered
            </h2>

            <p>
                Your monitor
                <strong>${monitorName}</strong>
                is healthy again.
            </p>

            <p>
                Uvix has detected successful responses and automatically resolved the incident.
            </p>

        </div>
        `
    });

    console.log(`Recovery email sent to ${email}`);
};

module.exports = {
    sendOtpEmail,
    sendIncidentOpenedEmail,
    sendIncidentResolvedEmail
};