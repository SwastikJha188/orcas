/** Thrown by services for invalid input; API routes answer 400 with the message. */
export class InputError extends Error {}

/** Thrown by services when a referenced row does not exist; API routes answer 404. */
export class NotFoundError extends Error {}
