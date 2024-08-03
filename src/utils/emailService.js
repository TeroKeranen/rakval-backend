require("dotenv").config();
const nodemailer = require('nodemailer');

// Generoi satunnainen koodi


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.APP_USERNAME,
        pass: process.env.APP_PASSWORD
    }
})

const sendVerificationEmail = (user,verificationCode) => {
    const mailOptions = {
        from: "rakivalafinland@gmail.com",
        to: user.email,
        subject: "Email verification",
        html: `<p>Your verification code is: ${verificationCode}`
    }

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("error sending email", error)
        } else {
            console.log("Email sent: " + info.response)
        }
    })
}

const sendDeleteAccountRequest = (userEmail,title,text) => {
    const mailOptions = {
        from: userEmail,
        to: "rakivalafinland@gmail.com",
        subject: `Account deletetion request from user: ${userEmail}`,
        html: `<h1>${title}</h1><p>${text}</p>`,
        replyTo: userEmail
    }

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("error sending email", error)
        } else {
            console.log("Email sent: ", info.response);
        }
    })
}

const passwordReset = (user,resetToken) => {
    const mailOptions = {
        from: "rakivalafinland@gmail.com",
        to: user.email,
        subject: 'Password Reset',
        html: `
        <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
        <p>Please click on the button below to complete the process:</p>
        <a href="https://rakival.com/reset-password/${resetToken}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 12px;">Reset Password</a>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `
    }

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("error sending passwordReset", error);
        } else {
            console.log("Email sent: ", info.response);
        }
    })
}

module.exports = { sendVerificationEmail, sendDeleteAccountRequest, passwordReset }