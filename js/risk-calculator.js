/**
 * risk-calculator.js
 * Real-time risk scoring for "Map My Minnesota DWI Path"
 * Calculates license risk, jail risk, urgency, likely charge, and next issue.
 */

/* global RiskCalculator, BranchingEngine */

var RiskCalculator = (function () {
  'use strict';

  /**
   * Convert a numeric score (0–100) to a risk level string
   * @param {number} score
   * @returns {string} 'low' | 'moderate' | 'high'
   */
  function scoreToLevel(score) {
    if (score >= 65) return 'high';
    if (score >= 35) return 'moderate';
    return 'low';
  }

  /**
   * Human-readable label for a level
   * @param {string} level
   * @returns {string}
   */
  function levelLabel(level) {
    if (level === 'high')     return 'HIGH';
    if (level === 'moderate') return 'MODERATE';
    if (level === 'low')      return 'LOW';
    return '—';
  }

  /**
   * Determine likely charge based on state
   * @param {Object} state
   * @returns {string}
   */
  function getLikelyCharge(state) {
    if (!state.priorHistory && !state.testType) return null;

    var test    = state.testType;
    var history = state.priorHistory;

    // Test refusal is its own charge regardless
    if (test === 'refused') {
      if (history === 'multiple') return 'Felony DWI + Test Refusal';
      if (history === 'one-prior') return 'Gross Misdemeanor Test Refusal';
      return '1st Degree Test Refusal (Misdemeanor)';
    }

    if (history === 'multiple') return 'Felony DWI (3rd+ offense)';
    if (history === 'one-prior') return 'Gross Misdemeanor DWI (2nd offense)';
    if (history === 'first') return 'Misdemeanor DWI (1st offense)';

    // Partial info
    if (test) return 'DWI — charge level TBD';
    return null;
  }

  /**
   * Determine the most pressing upcoming issue
   * @param {Object} state
   * @returns {string}
   */
  function getNextIssue(state) {
    var flags = BranchingEngine.getFlags(state);

    if (flags.isRefusal) {
      return '7-day license challenge deadline';
    }
    if (flags.wasArrested && !state.testType) {
      return 'Determine license revocation status';
    }
    if (flags.wasArrested) {
      return 'License revocation — act within 7 days';
    }
    if (flags.hasMultiplePriors) {
      return 'Felony arraignment + bail conditions';
    }
    if (flags.hasOnePrior) {
      return 'Gross misdemeanor arraignment';
    }
    if (flags.isBloodTest) {
      return 'Await blood test results (2–6 weeks)';
    }
    if (state.county === 'olmsted') {
      return 'Olmsted County court appearance';
    }
    if (state.priorHistory === 'first') {
      return 'First court appearance (arraignment)';
    }
    return 'Confirm court date and license status';
  }

  /**
   * Calculate license risk score (0–100)
   * @param {Object} state
   * @returns {number}
   */
  function calcLicenseScore(state) {
    var score = 30; // baseline

    // Test type is the biggest driver
    switch (state.testType) {
      case 'refused': score = 88; break;
      case 'blood':   score = 65; break;
      case 'urine':   score = 60; break;
      case 'breath':  score = 58; break;
      case 'unsure':  score = 50; break;
      default: break;
    }

    // Prior history adds to risk
    if (state.priorHistory === 'multiple')  score += 10;
    if (state.priorHistory === 'one-prior') score += 7;

    // Arrest vs citation
    if (state.situation === 'arrested') score += 5;
    if (state.situation === 'cited')    score -= 10;

    // Entry choice hints
    if (state.entryChoice === 'license')  score += 5;
    if (state.entryChoice === 'just-stopped') score -= 5;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate jail risk score (0–100)
   * @param {Object} state
   * @returns {number}
   */
  function calcJailScore(state) {
    var score = 15; // baseline

    // Prior history is the biggest driver for jail
    switch (state.priorHistory) {
      case 'multiple':  score = 78; break;
      case 'one-prior': score = 48; break;
      case 'first':     score = 20; break;
      default: break;
    }

    // Test refusal adds risk
    if (state.testType === 'refused') score += 12;

    // Arrest adds risk
    if (state.situation === 'arrested') score += 6;
    if (state.situation === 'cited')    score -= 8;

    // Fear of jail suggests higher awareness (no mathematical change)
    // Blood test: pending results could add charges
    if (state.testType === 'blood' && state.priorHistory === 'multiple') score += 5;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate urgency score (1–10)
   * @param {Object} state
   * @returns {number}
   */
  function calcUrgencyScore(state) {
    var base = 4.0; // baseline — neutral

    // Test type base
    switch (state.testType) {
      case 'refused': base = 8.5; break;
      case 'blood':   base = 6.5; break;
      case 'urine':   base = 6.0; break;
      case 'breath':  base = 5.5; break;
      case 'unsure':  base = 5.0; break;
      default: break;
    }

    // Prior history modifier
    if (state.priorHistory === 'multiple')  base += 1.5;
    if (state.priorHistory === 'one-prior') base += 0.8;

    // Situation modifier
    if (state.situation === 'arrested') base += 0.5;
    if (state.situation === 'cited')    base -= 0.8;

    // Entry choice hints
    if (state.entryChoice === 'court')      base += 0.5;
    if (state.entryChoice === 'just-stopped') base -= 0.5;

    // Apply branching engine modifier
    var branchMod = BranchingEngine.getUrgencyModifier(state);
    base = base * Math.min(branchMod, 1.2); // cap amplification

    return Math.min(10, Math.max(1, Math.round(base * 10) / 10));
  }

  /**
   * Get urgency score CSS class
   * @param {number} score
   * @returns {string}
   */
  function urgencyClass(score) {
    if (score >= 7) return 'score-high';
    if (score >= 4) return 'score-moderate';
    return 'score-low';
  }

  /**
   * Main calculation — returns complete risk profile
   * @param {Object} state
   * @returns {Object}
   */
  function calculate(state) {
    // If we have no meaningful data yet, return placeholder
    var hasData = state.testType || state.priorHistory || state.situation;

    if (!hasData) {
      return {
        licenseScore:  0,
        licenseLevel:  'unknown',
        licenseLabel:  '—',
        jailScore:     0,
        jailLevel:     'unknown',
        jailLabel:     '—',
        urgency:       0,
        urgencyClass:  'score-unknown',
        likelyCharge:  null,
        nextIssue:     null,
        isEstimate:    false,
        hasData:       false,
      };
    }

    var licenseScore = calcLicenseScore(state);
    var jailScore    = calcJailScore(state);
    var urgency      = calcUrgencyScore(state);
    var licenseLevel = scoreToLevel(licenseScore);
    var jailLevel    = scoreToLevel(jailScore);

    return {
      licenseScore:  licenseScore,
      licenseLevel:  licenseLevel,
      licenseLabel:  levelLabel(licenseLevel),
      jailScore:     jailScore,
      jailLevel:     jailLevel,
      jailLabel:     levelLabel(jailLevel),
      urgency:       urgency,
      urgencyClass:  urgencyClass(urgency),
      likelyCharge:  getLikelyCharge(state),
      nextIssue:     getNextIssue(state),
      isEstimate:    !state.county, // still incomplete
      hasData:       true,
    };
  }

  /**
   * Get urgency description text
   * @param {number} score
   * @returns {string}
   */
  function getUrgencyDesc(score) {
    if (score >= 9)  return 'Immediate action required today';
    if (score >= 7)  return 'Act within the next 24–48 hours';
    if (score >= 5)  return 'Action needed this week';
    if (score >= 3)  return 'Plan your next steps soon';
    return 'You have time, but don\'t delay';
  }

  // Public API
  return {
    calculate:      calculate,
    scoreToLevel:   scoreToLevel,
    levelLabel:     levelLabel,
    getLikelyCharge: getLikelyCharge,
    getNextIssue:   getNextIssue,
    urgencyClass:   urgencyClass,
    getUrgencyDesc: getUrgencyDesc,
  };
}());
