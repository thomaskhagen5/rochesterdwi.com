/**
 * branching-engine.js
 * Smart conditional logic for "Map My Minnesota DWI Path"
 * Determines tone, urgency, warnings, and roadmap adaptations
 * based on the user's collected state.
 */

/* global BranchingEngine */

var BranchingEngine = (function () {
  'use strict';

  /**
   * Determine conversational tone based on state
   * @param {Object} state - Current app state
   * @returns {string} 'calm' | 'concerned' | 'urgent' | 'critical'
   */
  function getTone(state) {
    var test    = state.testType;
    var history = state.priorHistory;

    if (test === 'refused' && history === 'multiple') return 'critical';
    if (test === 'refused') return 'urgent';
    if (history === 'multiple') return 'urgent';
    if (history === 'one-prior') return 'concerned';
    if (test === 'blood') return 'concerned';
    return 'calm';
  }

  /**
   * Get all active boolean flags for this state
   * @param {Object} state
   * @returns {Object}
   */
  function getFlags(state) {
    return {
      isRefusal:        state.testType === 'refused',
      isBloodTest:      state.testType === 'blood',
      isUnsure:         state.testType === 'unsure',
      isFirstOffense:   state.priorHistory === 'first',
      hasOnePrior:      state.priorHistory === 'one-prior',
      hasMultiplePriors: state.priorHistory === 'multiple',
      isOlmsted:        state.county === 'olmsted',
      isBlueEarth:      state.county === 'blue-earth',
      isOtherCounty:    state.county === 'other',
      wasArrested:      state.situation === 'arrested',
      wasCited:         state.situation === 'cited',
      isUnsureSituation: state.situation === 'unsure',
      fearIsJail:       state.biggestFear === 'jail',
      fearIsLicense:    state.biggestFear === 'license',
      fearIsInterlock:  state.biggestFear === 'interlock',
      fearIsCost:       state.biggestFear === 'cost',
      fearIsJob:        state.biggestFear === 'job',
      fearIsCourt:      state.biggestFear === 'court',
      entryJustStopped: state.entryChoice === 'just-stopped',
      entryArrested:    state.entryChoice === 'arrested',
      entryPaperwork:   state.entryChoice === 'paperwork',
      entryLicense:     state.entryChoice === 'license',
      entryCourt:       state.entryChoice === 'court',
      entryCost:        state.entryChoice === 'cost',
    };
  }

  /**
   * Get urgency multiplier (used in risk calculation)
   * @param {Object} state
   * @returns {number}
   */
  function getUrgencyModifier(state) {
    var mod = 1.0;
    if (state.testType === 'refused')       mod *= 1.6;
    if (state.testType === 'blood')         mod *= 1.15;
    if (state.priorHistory === 'multiple')  mod *= 1.35;
    if (state.priorHistory === 'one-prior') mod *= 1.15;
    if (state.situation === 'arrested')     mod *= 1.1;
    if (state.situation === 'cited')        mod *= 0.9;
    if (state.entryChoice === 'court')      mod *= 1.1;
    return mod;
  }

  /**
   * Get tone banner message shown above questions
   * @param {string} tone
   * @param {Object} flags
   * @returns {{ icon: string, text: string }}
   */
  function getToneBanner(tone, flags) {
    if (tone === 'critical') {
      return {
        icon: '🚨',
        text: 'This is a critical situation. Test refusal combined with prior DWIs can mean felony charges. Every hour matters — get legal help today.'
      };
    }
    if (tone === 'urgent') {
      if (flags.isRefusal) {
        return {
          icon: '⚠️',
          text: 'Test refusal triggers automatic consequences — a separate criminal charge AND immediate license revocation. The 7-day challenge window is critical.'
        };
      }
      if (flags.hasMultiplePriors) {
        return {
          icon: '⚠️',
          text: 'With multiple prior DWIs, mandatory minimum sentences may apply. This is felony territory. An experienced DWI attorney is essential now.'
        };
      }
      return {
        icon: '⚠️',
        text: 'Your situation has significant risks. Immediate action can preserve your options — waiting makes things harder.'
      };
    }
    if (tone === 'concerned') {
      if (flags.hasOnePrior) {
        return {
          icon: '⚡',
          text: 'A second DWI is a gross misdemeanor in Minnesota — more serious penalties apply. But with the right approach, outcomes can often be improved.'
        };
      }
      return {
        icon: '⚡',
        text: 'Your situation has some elevated risk factors. Let\'s map exactly what you\'re facing and what you can do about it.'
      };
    }
    // calm
    return {
      icon: '✅',
      text: 'You have options. Many first-offense cases have good outcomes with the right legal strategy. Let\'s map your path and protect your future.'
    };
  }

  /**
   * Get list of warning items to display
   * @param {Object} state
   * @returns {Array<{ level: string, title: string, text: string }>}
   */
  function getWarnings(state) {
    var warnings = [];
    var flags = getFlags(state);

    if (flags.isRefusal) {
      warnings.push({
        level: 'critical',
        title: 'Test Refusal — Dual Consequences',
        text: 'In Minnesota, refusing a chemical test results in (1) automatic license revocation AND (2) a separate criminal charge for test refusal. Both can apply even if you\'re not convicted of DWI. You have a narrow window to challenge the revocation.'
      });
    }

    if (flags.hasMultiplePriors) {
      warnings.push({
        level: 'critical',
        title: 'Felony DWI Territory',
        text: 'A third DWI within 10 years is a felony in Minnesota, carrying mandatory minimum jail time of 180 days and possible prison. The stakes are significantly higher — experienced representation is not optional.'
      });
    }

    if (flags.wasArrested && flags.isBloodTest) {
      warnings.push({
        level: 'warning',
        title: 'Blood Test Results Pending',
        text: 'Blood test results typically take 2–6 weeks. Additional charges may be added when results arrive. Do not wait for results to take action — start your defense now.'
      });
    }

    if (flags.hasOnePrior) {
      warnings.push({
        level: 'warning',
        title: 'Gross Misdemeanor Exposure',
        text: 'A second DWI within 10 years is a gross misdemeanor in Minnesota, with up to 1 year in jail and a $3,000 fine. Prior history significantly impacts sentencing.'
      });
    }

    if (flags.fearIsJob) {
      warnings.push({
        level: 'info',
        title: 'Employment Impact',
        text: 'A DWI conviction can affect CDL holders immediately. For other drivers, it depends on your employer and the nature of your job. An attorney can help minimize conviction-based employment impacts.'
      });
    }

    return warnings;
  }

  /**
   * Get roadmap adaptation — which nodes are active/alert
   * @param {Object} state
   * @returns {{ completedNodes: string[], currentNode: string, alertNodes: string[] }}
   */
  function getRoadmapState(state) {
    var flags = getFlags(state);
    var completed = [];
    var alertNodes = [];
    var current = 'stop'; // default

    // STOP node always activated when situation is known
    if (state.situation) {
      completed.push('stop');
    }

    // TEST node
    if (state.testType) {
      completed.push('test');
      if (flags.isRefusal) {
        alertNodes.push('test');
      }
    }

    // LICENSE node — active if license is at risk
    if (state.testType && (flags.isRefusal || flags.wasArrested || flags.hasOnePrior || flags.hasMultiplePriors)) {
      if (state.priorHistory) {
        completed.push('license');
        if (flags.isRefusal) alertNodes.push('license');
      }
    }

    // COURT node
    if (state.county) {
      completed.push('court');
    }

    // Determine current node (first not completed)
    var allNodes = ['stop', 'test', 'license', 'court', 'outcome', 'next'];
    current = allNodes.find(function (n) {
      return !completed.includes(n);
    }) || 'next';

    // If we're in results, mark all as completed
    if (state.stage === 'results') {
      completed = allNodes.slice();
      current = 'next';
    }

    return {
      completedNodes: completed,
      currentNode:    current,
      alertNodes:     alertNodes,
    };
  }

  /**
   * Get fear-adapted emphasis for results
   * @param {Object} state
   * @returns {{ headline: string, emphasis: string }}
   */
  function getFearEmphasis(state) {
    switch (state.biggestFear) {
      case 'jail':
        return {
          headline: 'Your Jail Risk — What to Know',
          emphasis: 'jail'
        };
      case 'license':
        return {
          headline: 'Your License — The Most Urgent Issue',
          emphasis: 'license'
        };
      case 'interlock':
        return {
          headline: 'Ignition Interlock — What to Expect',
          emphasis: 'interlock'
        };
      case 'cost':
        return {
          headline: 'The Real Costs — Breaking It Down',
          emphasis: 'cost'
        };
      case 'job':
        return {
          headline: 'Employment Impact — What\'s at Risk',
          emphasis: 'job'
        };
      case 'court':
        return {
          headline: 'Going to Court — The Process Ahead',
          emphasis: 'court'
        };
      default:
        return {
          headline: 'Your Situation — What Comes Next',
          emphasis: 'general'
        };
    }
  }

  /**
   * Get entry choice framing text
   * @param {string} entryChoice
   * @returns {string}
   */
  function getEntryFraming(entryChoice) {
    var framings = {
      'just-stopped':  'You were recently stopped — let\'s figure out what you\'re facing and what to do first.',
      'arrested':      'You were arrested — here\'s exactly what needs to happen next.',
      'paperwork':     'You\'ve got paperwork — let\'s decode what it means and what to do about it.',
      'license':       'Your license is your top concern — let\'s focus on protecting your ability to drive.',
      'court':         'With court coming up, let\'s make sure you\'re prepared and know your options.',
      'cost':          'Cost is real — let\'s understand what you\'re facing and how to manage it wisely.',
    };
    return framings[entryChoice] || 'Let\'s map your DWI situation and show you the path forward.';
  }

  // Public API
  return {
    getTone:            getTone,
    getFlags:           getFlags,
    getUrgencyModifier: getUrgencyModifier,
    getToneBanner:      getToneBanner,
    getWarnings:        getWarnings,
    getRoadmapState:    getRoadmapState,
    getFearEmphasis:    getFearEmphasis,
    getEntryFraming:    getEntryFraming,
  };
}());
