// src/globals/heState.js

// Initial state (null until initialized asynchronously)
export let seal = null;
export let context = null;
export let evaluator = null;
export let encoders = {};
export let keyCollection = {}; // Map to hold Public/Evaluation Keys (loaded from DB)

/**
 * Function called by server.js after successful initialization.
 */
export function setHEGlobals(newSeal, newContext, newEvaluator, newEncoders) {
    seal = newSeal;
    context = newContext;
    evaluator = newEvaluator;
    encoders = newEncoders;
    // keyCollection is usually loaded later in the API router, so we leave it as a mutable object.
}