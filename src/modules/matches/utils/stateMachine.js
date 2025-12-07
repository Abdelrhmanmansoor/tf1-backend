// State machine for match states
const VALID_TRANSITIONS = {
  draft: ['open'],
  open: ['full', 'canceled'],
  full: ['in_progress', 'open'],
  in_progress: ['finished', 'canceled'],
  finished: [],
  canceled: []
};

class StateMachine {
  static canTransition(currentState, newState) {
    const allowedStates = VALID_TRANSITIONS[currentState] || [];
    return allowedStates.includes(newState);
  }

  static validateTransition(currentState, newState) {
    if (!this.canTransition(currentState, newState)) {
      throw new Error(
        `Invalid state transition from '${currentState}' to '${newState}'. ` +
        `Allowed transitions: ${VALID_TRANSITIONS[currentState]?.join(', ') || 'none'}`
      );
    }
  }

  static getAllowedTransitions(currentState) {
    return VALID_TRANSITIONS[currentState] || [];
  }
}

module.exports = StateMachine;
