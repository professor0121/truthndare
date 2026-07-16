import { ApiError } from "../utils/ApiError.js";

/**
 * Validates incoming request using a Zod schema.
 * Expects a Zod schema object that can validate req.body, req.query, or req.params.
 */
const validate = (schema) => (req, res, next) => {
  try {
    // We only validate the parts of the request defined in the schema
    const dataToValidate = {};
    if (schema.shape.body) dataToValidate.body = req.body;
    if (schema.shape.query) dataToValidate.query = req.query;
    if (schema.shape.params) dataToValidate.params = req.params;

    const result = schema.parse(dataToValidate);

    // Replace request properties with parsed/validated data (this handles coercion/defaults if any)
    if (result.body) req.body = result.body;
    if (result.query) req.query = result.query;
    if (result.params) req.params = result.params;

    return next();
  } catch (error) {
    // If Zod validation error, extract error details
    const errors = error.errors ? error.errors.map((err) => ({
      field: err.path.slice(1).join("."), // removes 'body', 'query', or 'params' prefix from path
      message: err.message,
    })) : [];

    return next(new ApiError(400, "Validation FAILED", errors));
  }
};

export { validate };
