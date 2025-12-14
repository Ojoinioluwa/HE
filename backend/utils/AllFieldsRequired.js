const allFieldsRequired = (fields) => {
    return fields.some(
        field =>
            field === undefined ||
            field === null ||
            (typeof field === "string" && field.trim() === "") ||
            (Array.isArray(field) && field.length === 0)
    );
};

module.exports = allFieldsRequired
