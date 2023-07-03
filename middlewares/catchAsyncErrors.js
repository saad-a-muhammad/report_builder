const ErrorHandler = require('../middlewares/error')
module.exports = func => (req,res,next) =>
    Promise.resolve(func(req,res,next))
            .catch(err=>{
                next(ErrorHandler(err,res));
            })