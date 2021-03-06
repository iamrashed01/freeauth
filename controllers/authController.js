const _ = require('lodash');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const {
  signupValidator,
  loginValidator,
  forgetPasswordValidator,
  resetPasswordValidator,
} = require('../validations/authValidator');
const { errorSend, successSend } = require('../utils/responseSender');
const sendEmail = require('../utils/sendEmail');

exports.registerController = async (req, res) => {
  const { error } = signupValidator(req.body);
  if (error) {
    return errorSend(res, 400, error.details[0].message);
  }

  let user = await User.findOne({ email: req.body.email });
  if (user) {
    return errorSend(res, 400, 'User already exists');
  }

  const code = Math.floor(100000 + Math.random() * 900000);
  const salt = await bcrypt.genSalt(10);
  user = await User(
    _.pick(req.body, ['name', 'gender', 'skills', 'email', 'password', 'phone']),
  );
  user.password = await bcrypt.hash(user.password, salt);
  user.verification_code = await bcrypt.hash(toString(code), salt);
  await user.save();
  sendEmail(user.email, code, 'Verification code');
  return successSend(
    res,
    200,
    {
      ..._.pick(user, [
        '_id',
        'name',
        'gender',
        'skills',
        'phone',
        'email',
        'email_verification_status',
        'phone_verification_status',
      ]),
      verification_code: code,
    },
    'Registration Successfull, Verification code has been sent.',
  );
};

exports.loginController = async (req, res) => {
  const { error } = loginValidator(req.body);
  if (error) {
    return errorSend(res, 400, error.details[0].message);
  }

  const code = Math.floor(100000 + Math.random() * 900000);
  const salt = await bcrypt.genSalt(10);
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return errorSend(res, 401, "email or password dosen't match");
  }

  const isValidPassword = await bcrypt.compare(
    req.body.password,
    user.password,
  );
  if (!isValidPassword) {
    return errorSend(res, 401, "email or password dosen't match");
  }

  const auth_token = user.generateAuthToken();

  if (user.email_verification_status == 0) {
    user.verification_code = await bcrypt.hash(String(code), salt);
    await user.save();
    sendEmail(user.email, code, 'Email verification Code');
    return res
      .status(200)
      .json({
        data: _.pick(user, [
          '_id',
          'email',
          'email_verification_status',
          'phone_verification_status',
        ]),
        verification_code: code,
        auth_token,
        message: 'Please check your email to verify account.',
        success: true,
      });
  }

  res.status(200).json({
    data: _.pick(user, [
      '_id',
      'name',
      'gender',
      'skills',
      'phone',
      'email',
      'email_verification_status',
      'phone_verification_status',
    ]),
    auth_token,
    message: 'Loged in successfully',
    success: true,
  });
};

exports.verifyAccountController = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return errorSend(res, 500, 'User not found');
  }

  if (user.email_verification_status) {
    return errorSend(res, 400, 'User already verified');
  }

  const validCode = await bcrypt.compare(req.body.code, user.verification_code);
  if (!validCode) {
    return errorSend(res, 400, 'Invalid Code!');
  }

  user.email_verification_status = 1;
  user.verification_code = null;
  await user.save();

  return successSend(res, 200, null, 'Account verified successfully');
};

exports.forgetPasswordController = async (req, res) => {
  const { error } = forgetPasswordValidator(req.body);
  if (error) {
    return errorSend(res, 400, error.details[0].message);
  }

  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return errorSend(res, 500, 'User not found');
  }

  const code = Math.floor(100000 + Math.random() * 900000);
  const salt = await bcrypt.genSalt(10);
  user.verification_code = await bcrypt.hash(String(code), salt);
  await user.save();
  sendEmail(user.email, code, 'Password reset verification Code');

  return successSend(res, 200, { verification_code: code }, 'password reset verification Code has been sent.');
};

exports.resetPasswordController = async (req, res) => {
  const { error } = resetPasswordValidator(req.body);
  if (error) {
    return errorSend(res, 400, error.details[0].message);
  }

  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return errorSend(res, 500, 'User not found');
  }

  try {
    try {
      const validCode = await bcrypt.compare(req.body.code, user.verification_code);
      if (!validCode) {
        return errorSend(res, 400, 'Invalid Code!');
      }
    } catch (ex) {
      return errorSend(res, 500, `${ex.message}, Try to resend code`);
    }
    const salt = await bcrypt.genSalt(10);
    user.verification_code = null;
    user.password = await bcrypt.hash(req.body.password, salt);

    await user.save();

    return successSend(res, 200, null, 'password reset successfully.');
  } catch (ex) {
    return errorSend(res, 500, ex.message);
  }
};
