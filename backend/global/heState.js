// src/globals/heState.js

/**
 * Homomorphic Encryption Session Store
 * One session per authenticated user.
 * Zero globals. Zero collisions.
 */

const heSessions = new Map();

/**
 * Create or replace a user HE session
 */
export function createHESession(userId, { seal, context, evaluator, encoder, relinKeys }) {
    if (!userId) throw new Error("Missing userId for HE session");

    // If the user already has a session, clean it up
    // if (heSessions.has(userId)) {
    //     destroyHESession(userId);
    // }

    heSessions.set(userId, {
        seal,
        context,
        evaluator,
        encoder,
        relinKeys,
        createdAt: Date.now()
    });
    console.log("end of CreateHESession")
}

/**
 * Get a user's HE session
 */
export function getHESession(userId) {
    const session = heSessions.get(userId);

    if (!session) {
        throw new Error("HE session not initialized for this user");
    }

    return session;
}

/**
 * Destroy a user's HE session (important for logout + re-init)
 */
// export function destroyHESession(userId) {
//     const session = heSessions.get(userId);
//     if (!session) return;

//     try {
//         // 1. Delete Encoders (They are often stored in an object)
//         if (session.encoders) {
//             Object.values(session.encoders).forEach(encoder => {
//                 if (encoder && typeof encoder.delete === 'function') {
//                     encoder.delete();
//                 }
//             });
//         }

//         // 2. Delete the Evaluator
//         if (session.evaluator && typeof session.evaluator.delete === 'function') {
//             session.evaluator.delete();
//         }

//         // 3. Delete the Context
//         if (session.context && typeof session.context.delete === 'function') {
//             session.context.delete();
//         }

//         console.log(`[HE] Session for ${userId} cleaned up successfully.`);
//     } catch (e) {
//         console.warn("HE cleanup warning:", e.message);
//     } finally {
//         heSessions.delete(userId);
//     }
// }
export function listActiveSessions() {
    return Array.from(heSessions.keys());
}
