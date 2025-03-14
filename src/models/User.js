
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true
    },

    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: 'user',
        
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: false,
    },
    verificationCode: {
        type: String,
        required: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    refreshToken: [{
        type:String,
        required: false
    }],
    resetPasswordToken: {
        type: String,
        required: false
    },
    resetPasswordExpires: {
        type: Date,
        required: false
    }
})

// tämä ajaa ennen kuin save tapahtuu
userSchema.pre('save', function (next) {
    const user = this;

    if (!user.isModified('password')) {
        return next();
    }

    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return next(err)
        }

        bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) {
                return next(err);
            }

            user.password = hash;
            next();
        })
    })
})

userSchema.methods.comparePassword = function (candidatePassword) {

    const user = this;

    return new Promise((resolve, reject) => {
        bcrypt.compare(candidatePassword, user.password, (err,  isMatch) => {
            if (err) {
                
                return reject(err);
            }

            if (!isMatch) {
                
                return reject(false);
            }
            
            resolve(true);
        } )
    })
}

mongoose.model('User', userSchema);