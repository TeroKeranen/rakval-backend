
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
        from: "terokeranentero@gmail.com",
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

module.exports = { sendVerificationEmail }