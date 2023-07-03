const ErrorHandler = require('../utils/errorHandler');

module.exports = (err,  res) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';

    if (process.env.NODE_ENV === 'development' ) {
        res.status(err.statusCode).json({
            success: false,
            error: err,
            errMessage: err.message,
            stack: err.stack
        })
    }
    if (process.env.NODE_ENV === 'production' ) {

        let error = {...err};
        error.message = err.message;

        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map(value=> value.message);
            error = new ErrorHandler(message, 400);
        }

        res.status(err.statusCode).json({
            success: false,
            errMessage: error.message || 'Internal Server Error'
        })
    }
}