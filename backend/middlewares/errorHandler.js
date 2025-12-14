const errorhandler = (err, req, res, next) => {
    if (err) {
        // change the status code to 500 if the status code is still 200 
        const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
        res.status(statusCode);
        // send the err message to the user along with the stack
        res.json({
            success: false,
            message: err.message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack
        })
    }
    else {
        next()
    }
}

export default errorhandler;