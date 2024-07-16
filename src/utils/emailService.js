
const nodemailer = require('nodemailer');

// Generoi satunnainen koodi


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "terokeranentero@gmail.com",
        pass: "guny fdym zdoa emtc"
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
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
          `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
          `https://rakival.com//reset-password/${resetToken}\n\n` +
          `If you did not request this, please ignore this email and your password will remain unchanged.\n`
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