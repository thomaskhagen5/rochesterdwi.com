/**
 * app.js
 * Main application — state management, question data, and coordination
 * "Map My Minnesota DWI Path" for rochesterdwi.com
 */

/* global App, BranchingEngine, RiskCalculator, ResultsGenerator, Animations */

var App = (function () {
  'use strict';

  /* -------------------------------------------------- */
  /* Application State                                  */
  /* -------------------------------------------------- */

  var state = {
    stage:          0,      // 0 = entry hook, 1–5 = questions, 'results'
    entryChoice:    null,   // Stage 0
    situation:      null,   // Stage 1: arrested | cited | unsure
    testType:       null,   // Stage 2: breath | blood | urine | refused | unsure
    biggestFear:    null,   // Stage 3: jail | license | interlock | cost | job | court
    priorHistory:   null,   // Stage 4: first | one-prior | multiple
    county:         null,   // Stage 5: olmsted | blue-earth | other
  };

  /* -------------------------------------------------- */
  /* Question Data                                      */
  /* -------------------------------------------------- */

  var QUESTIONS = {
    0: {
      id: 'entry',
      eyebrow: 'Start Here',
      question: 'What describes your situation right now?',
      subtitle: 'Pick what fits best — your entire path adapts to your answer.',
      stateKey: 'entryChoice',
      gridClass: 'grid-2col',
      options: [
        { id: 'just-stopped', icon: '🚔', label: 'I was just stopped', sublabel: 'Very recent stop or traffic contact' },
        { id: 'arrested',     icon: '🚨', label: 'I was arrested last night', sublabel: 'Taken into custody recently' },
        { id: 'paperwork',   icon: '📋', label: 'I already got paperwork', sublabel: 'Citation or revocation notice' },
        { id: 'license',     icon: '🚗', label: "I'm worried about my license", sublabel: 'Driving privileges at risk' },
        { id: 'court',       icon: '⚖️', label: 'I have court coming up', sublabel: 'Court date scheduled' },
        { id: 'cost',        icon: '💰', label: "I'm most worried about the cost", sublabel: 'Fines, fees, and future impact' },
      ],
    },
    1: {
      id: 'situation',
      eyebrow: 'Step 1 of 5',
      question: 'What happened when police stopped you?',
      subtitle: 'This determines where you are in the process.',
      stateKey: 'situation',
      options: [
        { id: 'arrested', icon: '🚨', label: 'I was arrested and taken to jail', sublabel: 'Handcuffed, transported, booked' },
        { id: 'cited',    icon: '📋', label: 'I was cited and released', sublabel: 'Given a ticket or citation at the scene' },
        { id: 'unsure',   icon: '❓', label: "I'm not exactly sure", sublabel: 'Still processing what happened' },
      ],
    },
    2: {
      id: 'test',
      eyebrow: 'Step 2 of 5',
      question: 'What happened with the chemical test?',
      subtitle: 'This has the biggest impact on your license and charges.',
      stateKey: 'testType',
      options: [
        { id: 'breath',  icon: '💨', label: 'I took a breath test', sublabel: 'Breathalyzer or DataMaster device' },
        { id: 'blood',   icon: '🩸', label: 'I took a blood test', sublabel: 'Blood draw at station or hospital' },
        { id: 'urine',   icon: '🧪', label: 'I took a urine test', sublabel: 'Urine sample collected' },
        { id: 'refused', icon: '✋', label: 'I refused the test', sublabel: 'Declined any chemical test' },
        { id: 'unsure',  icon: '❓', label: "I'm not sure", sublabel: "I don't know what was collected" },
      ],
    },
    3: {
      id: 'fear',
      eyebrow: 'Step 3 of 5',
      question: 'What are you most worried about right now?',
      subtitle: "Your biggest concern shapes your path — pick the one that matters most.",
      stateKey: 'biggestFear',
      gridClass: 'grid-2col',
      options: [
        { id: 'jail',      icon: '🔒', label: 'Going to jail', sublabel: 'Worried about incarceration' },
        { id: 'license',   icon: '🚗', label: 'Losing my license', sublabel: 'Ability to drive to work' },
        { id: 'interlock', icon: '🔑', label: 'Ignition interlock', sublabel: 'Breathalyzer in my car' },
        { id: 'cost',      icon: '💰', label: 'The cost of all this', sublabel: 'Fines, fees, and attorney costs' },
        { id: 'job',       icon: '💼', label: 'Impact on my job', sublabel: 'Employment and driving record' },
        { id: 'court',     icon: '⚖️', label: 'Going to court', sublabel: 'The legal process itself' },
      ],
    },
    4: {
      id: 'history',
      eyebrow: 'Step 4 of 5',
      question: 'Have you had any DWI charges in the last 10 years?',
      subtitle: 'Prior history significantly affects your charge level and options.',
      stateKey: 'priorHistory',
      options: [
        { id: 'first',     icon: '1️⃣', label: 'No — this is my first DWI', sublabel: 'No prior DWI charges' },
        { id: 'one-prior', icon: '2️⃣', label: 'Yes — one prior DWI', sublabel: 'One previous charge in last 10 years' },
        { id: 'multiple',  icon: '⚠️', label: 'Yes — multiple prior DWIs', sublabel: 'Two or more previous charges' },
      ],
    },
    5: {
      id: 'county',
      eyebrow: 'Step 5 of 5 — Final Question',
      question: 'Where were you stopped or arrested?',
      subtitle: 'Local courts matter. We know the judges, prosecutors, and procedures.',
      stateKey: 'county',
      options: [
        { id: 'olmsted',    icon: '📍', label: 'Olmsted County', sublabel: 'Rochester and surrounding area' },
        { id: 'blue-earth', icon: '📍', label: 'Blue Earth County', sublabel: 'Mankato and surrounding area' },
        { id: 'other',      icon: '📍', label: 'Other Minnesota county', sublabel: 'Elsewhere in southern Minnesota' },
      ],
    },
  };

  /* -------------------------------------------------- */
  /* Roadmap node definitions                           */
  /* -------------------------------------------------- */

  var ROADMAP_NODES = [
    { id: 'stop',    emoji: '🚔', label: 'STOP',     desc: 'The traffic stop' },
    { id: 'test',    emoji: '🧪', label: 'TEST',     desc: 'Chemical test' },
    { id: 'license', emoji: '🪪', label: 'LICENSE',  desc: 'License status' },
    { id: 'court',   emoji: '⚖️', label: 'COURT',   desc: 'Court appearance' },
    { id: 'outcome', emoji: '📋', label: 'OUTCOME',  desc: 'Case result' },
    { id: 'next',    emoji: '🎯', label: 'NEXT MOVE', desc: 'Your action plan' },
  ];

  /* -------------------------------------------------- */
  /* DOM References                                     */
  /* -------------------------------------------------- */

  var els = {};

  function cacheEls() {
    els.stageContainer   = document.getElementById('stage-container');
    els.progressContainer = document.getElementById('progress-container');
    els.progressFill     = document.getElementById('progress-fill');
    els.progressStep     = document.getElementById('progress-step');
    els.roadmap          = document.getElementById('roadmap');
    els.roadmapMobile    = document.getElementById('roadmap-mobile');
    els.riskPanel        = document.getElementById('risk-panel');
    els.riskMobile       = document.getElementById('risk-mobile');
    els.toneBanner       = document.getElementById('tone-banner');
  }

  /* -------------------------------------------------- */
  /* Initialization                                     */
  /* -------------------------------------------------- */

  function init() {
    cacheEls();
    buildRoadmap();
    buildMobileRoadmap();
    renderStage(0);
    initRiskPanel();
  }

  /* -------------------------------------------------- */
  /* Roadmap Building                                   */
  /* -------------------------------------------------- */

  function buildRoadmap() {
    if (!els.roadmap) return;
    var html = ROADMAP_NODES.map(function (node) {
      return '<div class="roadmap-node inactive" data-node="' + node.id + '">' +
        '<div class="roadmap-node-icon">' +
          '<span class="node-emoji">' + node.emoji + '</span>' +
        '</div>' +
        '<div class="roadmap-node-content">' +
          '<div class="roadmap-node-label">' + node.label + '</div>' +
          '<div class="roadmap-node-desc">' + node.desc + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    els.roadmap.innerHTML = html;
  }

  function buildMobileRoadmap() {
    if (!els.roadmapMobile) return;
    var parts = [];
    ROADMAP_NODES.forEach(function (node, i) {
      parts.push(
        '<div class="roadmap-mobile-node inactive" data-node="' + node.id + '">' +
          '<div class="roadmap-mobile-icon">' + node.emoji + '</div>' +
          '<div class="roadmap-mobile-label">' + node.label + '</div>' +
        '</div>'
      );
      if (i < ROADMAP_NODES.length - 1) {
        parts.push('<div class="roadmap-mobile-connector" data-index="' + i + '"></div>');
      }
    });
    els.roadmapMobile.innerHTML = parts.join('');
  }

  /* -------------------------------------------------- */
  /* Stage Rendering                                    */
  /* -------------------------------------------------- */

  function renderStage(stageIndex) {
    var q = QUESTIONS[stageIndex];
    if (!q) return;

    var isEntry = (stageIndex === 0);

    // Build stage HTML
    var stageEl = document.createElement('div');
    stageEl.className = 'stage' + (isEntry ? ' stage-entry' : '');
    stageEl.id = 'stage-' + stageIndex;
    stageEl.setAttribute('data-stage', stageIndex);

    var backBtn = stageIndex > 0
      ? '<button class="back-btn" id="back-btn-' + stageIndex + '" aria-label="Go back">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
          'Back' +
        '</button>'
      : '';

    var optionsHtml = q.options.map(function (opt) {
      return '<button class="answer-card" data-value="' + opt.id + '" ' +
        'aria-label="' + escAttr(opt.label) + '" role="button">' +
        '<div class="card-icon">' + opt.icon + '</div>' +
        '<div class="card-text">' +
          '<span class="card-label">' + opt.label + '</span>' +
          '<span class="card-sublabel">' + opt.sublabel + '</span>' +
        '</div>' +
        '<div class="card-check" aria-hidden="true"></div>' +
      '</button>';
    }).join('');

    stageEl.innerHTML = backBtn +
      '<div class="stage-question-wrap">' +
        '<span class="stage-eyebrow">' + q.eyebrow + '</span>' +
        '<h2 class="stage-question">' + q.question + '</h2>' +
        '<p class="stage-subtitle">' + q.subtitle + '</p>' +
      '</div>' +
      '<div class="card-grid ' + (q.gridClass || '') + '">' + optionsHtml + '</div>';

    // Attach event listeners
    var cards = stageEl.querySelectorAll('.answer-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        handleAnswer(stageIndex, card.getAttribute('data-value'), card);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleAnswer(stageIndex, card.getAttribute('data-value'), card);
        }
      });
    });

    var backButton = stageEl.querySelector('.back-btn');
    if (backButton) {
      backButton.addEventListener('click', function () {
        goBack(stageIndex);
      });
    }

    // Transition in
    var currentEl = els.stageContainer.querySelector('.stage.active');

    // Add to DOM
    els.stageContainer.appendChild(stageEl);

    // Hide old stage and show new
    if (currentEl) {
      Animations.transitionStage(currentEl, stageEl, function () {
        // Clean up old stage from DOM to save memory
        if (currentEl.parentNode) {
          currentEl.parentNode.removeChild(currentEl);
        }
      });
    } else {
      stageEl.style.position = 'relative';
      stageEl.style.opacity = '1';
      stageEl.style.transform = 'none';
      stageEl.classList.add('active');
    }

    // Update progress
    updateProgress(stageIndex);

    // Update tone banner
    updateToneBanner();

    // Scroll to top
    Animations.scrollToTop();
  }

  /* -------------------------------------------------- */
  /* Answer Handling                                    */
  /* -------------------------------------------------- */

  function handleAnswer(stageIndex, value, cardEl) {
    // Animate card selection
    Animations.selectCard(cardEl);

    // Save to state
    var q = QUESTIONS[stageIndex];
    state[q.stateKey] = value;
    state.stage = stageIndex;

    // Brief delay for card animation before transitioning
    setTimeout(function () {
      if (stageIndex === 0) {
        // After entry hook, go to Stage 1
        renderStage(1);
      } else if (stageIndex < 5) {
        renderStage(stageIndex + 1);
      } else {
        // All 5 questions answered — show results
        showResults();
      }

      // Update risk panel after each answer
      updateRiskPanel();

      // Update roadmap
      updateRoadmapDisplay();

    }, 320);
  }

  /* -------------------------------------------------- */
  /* Back Navigation                                    */
  /* -------------------------------------------------- */

  function goBack(currentStage) {
    var prevStage = currentStage - 1;
    if (prevStage < 0) return;

    // Clear state for current stage
    var currentQ = QUESTIONS[currentStage];
    if (currentQ) {
      state[currentQ.stateKey] = null;
    }

    // Re-render previous stage
    renderStage(prevStage);

    updateRiskPanel();
    updateRoadmapDisplay();
  }

  /* -------------------------------------------------- */
  /* Results Page                                       */
  /* -------------------------------------------------- */

  function showResults() {
    state.stage = 'results';

    var risk  = RiskCalculator.calculate(state);
    var tone  = BranchingEngine.getTone(state);
    var flags = BranchingEngine.getFlags(state);

    // Generate results HTML
    var resultsHtml = ResultsGenerator.generate(state, risk, tone, flags);

    // Create results element
    var resultsEl = document.createElement('div');
    resultsEl.id = 'results-stage';
    resultsEl.className = 'stage';
    resultsEl.setAttribute('data-stage', 'results');
    resultsEl.innerHTML = resultsHtml;

    // Add to DOM
    els.stageContainer.appendChild(resultsEl);

    // Reveal animation
    var currentEl = els.stageContainer.querySelector('.stage.active');
    Animations.revealResults(currentEl, resultsEl, function () {
      if (currentEl && currentEl.parentNode) {
        currentEl.parentNode.removeChild(currentEl);
      }

      // Wire up restart button
      var restartBtn = document.getElementById('restart-btn');
      if (restartBtn) {
        restartBtn.addEventListener('click', restartApp);
      }

      // Wire up email button
      var emailBtn = document.getElementById('email-results-btn');
      if (emailBtn) {
        emailBtn.addEventListener('click', emailResults);
      }
    });

    // Final roadmap update (all nodes lit)
    updateRoadmapDisplay();
    updateProgress(6); // 100% complete

    // Hide tone banner
    if (els.toneBanner) {
      els.toneBanner.style.display = 'none';
    }

    // Update risk panel (final state)
    updateRiskPanel();

    Animations.scrollToTop();
  }

  /* -------------------------------------------------- */
  /* Risk Panel                                         */
  /* -------------------------------------------------- */

  function initRiskPanel() {
    var panelHtml =
      '<div class="risk-panel-header">' +
        '<div class="risk-panel-title">Live Risk Meter</div>' +
        '<div class="risk-panel-status building" id="risk-status">Answer questions to see your risk profile</div>' +
      '</div>' +
      '<div class="risk-items">' +
        // License risk
        '<div class="risk-item">' +
          '<div class="risk-item-header">' +
            '<span class="risk-item-label">License Risk</span>' +
            '<span class="risk-item-value unknown" id="license-val">—</span>' +
          '</div>' +
          '<div class="risk-bar-track">' +
            '<div class="risk-bar-fill loading" id="license-bar" style="width:30%"></div>' +
          '</div>' +
        '</div>' +
        // Jail risk
        '<div class="risk-item">' +
          '<div class="risk-item-header">' +
            '<span class="risk-item-label">Jail Risk</span>' +
            '<span class="risk-item-value unknown" id="jail-val">—</span>' +
          '</div>' +
          '<div class="risk-bar-track">' +
            '<div class="risk-bar-fill loading" id="jail-bar" style="width:30%"></div>' +
          '</div>' +
        '</div>' +
        // Urgency score
        '<div class="urgency-item" id="urgency-item">' +
          '<div class="urgency-label">Urgency Score</div>' +
          '<div class="urgency-score-wrap">' +
            '<span class="urgency-score score-unknown" id="urgency-score">—</span>' +
            '<span class="urgency-denom" id="urgency-denom"></span>' +
          '</div>' +
          '<div class="urgency-desc" id="urgency-desc">Answering your questions...</div>' +
        '</div>' +
      '</div>' +
      '<div class="risk-divider"></div>' +
      '<div class="risk-info-items">' +
        '<div class="risk-info-item" id="next-issue-item">' +
          '<div class="risk-info-label">Next Issue</div>' +
          '<div class="risk-info-value unknown" id="next-issue-val">Building your profile...</div>' +
        '</div>' +
        '<div class="risk-info-item" id="likely-charge-item">' +
          '<div class="risk-info-label">Likely Charge</div>' +
          '<div class="risk-info-value unknown" id="likely-charge-val">Depends on your answers</div>' +
        '</div>' +
      '</div>' +
      '<div class="risk-panel-cta">' +
        '<p class="risk-panel-cta-text">Questions about your risk profile? Talk to us — free consultation.</p>' +
        '<a href="tel:5076255000" class="risk-panel-call-btn">📞 507-625-5000</a>' +
      '</div>';

    if (els.riskPanel) {
      els.riskPanel.innerHTML = panelHtml;
    }
  }

  function updateRiskPanel() {
    var risk  = RiskCalculator.calculate(state);
    var flags = BranchingEngine.getFlags(state);

    // Update status line
    var statusEl = document.getElementById('risk-status');
    if (statusEl) {
      if (risk.hasData) {
        statusEl.textContent = 'Updating in real time...';
        statusEl.className = 'risk-panel-status active';
      }
    }

    if (!risk.hasData) return;

    // License bar
    var licenseBar = document.getElementById('license-bar');
    var licenseVal = document.getElementById('license-val');
    if (licenseBar) Animations.animateRiskBar(licenseBar, risk.licenseScore, risk.licenseLevel);
    if (licenseVal) {
      licenseVal.textContent = risk.licenseLabel;
      licenseVal.className = 'risk-item-value ' + risk.licenseLevel;
    }

    // Jail bar
    var jailBar = document.getElementById('jail-bar');
    var jailVal = document.getElementById('jail-val');
    if (jailBar) Animations.animateRiskBar(jailBar, risk.jailScore, risk.jailLevel);
    if (jailVal) {
      jailVal.textContent = risk.jailLabel;
      jailVal.className = 'risk-item-value ' + risk.jailLevel;
    }

    // Urgency score
    var urgencyScoreEl = document.getElementById('urgency-score');
    var urgencyDescEl  = document.getElementById('urgency-desc');
    var urgencyDenomEl = document.getElementById('urgency-denom');
    var urgencyItem    = document.getElementById('urgency-item');

    if (urgencyScoreEl) {
      Animations.animateUrgencyScore(urgencyScoreEl, Math.round(risk.urgency), risk.urgencyClass);
    }
    if (urgencyDenomEl) urgencyDenomEl.textContent = '/10';
    if (urgencyDescEl)  urgencyDescEl.textContent = RiskCalculator.getUrgencyDesc(risk.urgency);
    if (urgencyItem) {
      urgencyItem.className = 'urgency-item ' + risk.urgencyClass.replace('score-', 'score-state-');
    }

    // Next issue
    var nextIssueVal  = document.getElementById('next-issue-val');
    var nextIssueItem = document.getElementById('next-issue-item');
    if (nextIssueVal && risk.nextIssue) {
      nextIssueVal.textContent = risk.nextIssue;
      nextIssueVal.className = 'risk-info-value ' + (flags.isRefusal ? 'high' : '');
      nextIssueVal.classList.remove('unknown');
      if (nextIssueItem) Animations.flashInfoItem(nextIssueItem);
    }

    // Likely charge
    var likelyChargeVal  = document.getElementById('likely-charge-val');
    var likelyChargeItem = document.getElementById('likely-charge-item');
    if (likelyChargeVal && risk.likelyCharge) {
      likelyChargeVal.textContent = risk.likelyCharge;
      likelyChargeVal.className = 'risk-info-value ' + (risk.jailLevel === 'high' ? 'high' : risk.jailLevel === 'moderate' ? 'moderate' : '');
      likelyChargeVal.classList.remove('unknown');
      if (likelyChargeItem) Animations.flashInfoItem(likelyChargeItem);
    }

    // Update mobile risk strip
    Animations.updateMobileRisk(risk);
  }

  /* -------------------------------------------------- */
  /* Tone Banner                                        */
  /* -------------------------------------------------- */

  function updateToneBanner() {
    if (!els.toneBanner) return;

    // Only show after Stage 1 (we need at least some data)
    if (state.stage < 1 && !state.situation && !state.testType) {
      els.toneBanner.style.display = 'none';
      return;
    }

    var hasData = state.situation || state.testType || state.priorHistory;
    if (!hasData) {
      els.toneBanner.style.display = 'none';
      return;
    }

    var tone   = BranchingEngine.getTone(state);
    var flags  = BranchingEngine.getFlags(state);
    var banner = BranchingEngine.getToneBanner(tone, flags);

    els.toneBanner.className = 'tone-banner ' + tone;
    els.toneBanner.style.display = 'flex';
    els.toneBanner.innerHTML =
      '<span class="tone-banner-icon">' + banner.icon + '</span>' +
      '<span class="tone-banner-text">' + banner.text + '</span>';
  }

  /* -------------------------------------------------- */
  /* Progress                                           */
  /* -------------------------------------------------- */

  function updateProgress(stageIndex) {
    if (!els.progressContainer) return;

    if (stageIndex === 0) {
      els.progressContainer.classList.remove('visible');
      return;
    }

    els.progressContainer.classList.add('visible');

    var total     = 5;
    var current   = Math.min(stageIndex, total);
    var pct       = stageIndex === 'results' || stageIndex >= 6
      ? 100
      : Math.round((current / total) * 100);

    if (els.progressFill) els.progressFill.style.width = pct + '%';
    if (els.progressStep) {
      if (stageIndex === 'results' || stageIndex >= 6) {
        els.progressStep.textContent = 'Complete!';
      } else {
        els.progressStep.textContent = 'Step ' + current + ' of ' + total;
      }
    }
  }

  /* -------------------------------------------------- */
  /* Roadmap Display                                    */
  /* -------------------------------------------------- */

  function updateRoadmapDisplay() {
    var roadmapState = BranchingEngine.getRoadmapState(state);
    Animations.updateRoadmap(
      roadmapState.completedNodes,
      roadmapState.currentNode,
      roadmapState.alertNodes
    );
  }

  /* -------------------------------------------------- */
  /* Restart                                            */
  /* -------------------------------------------------- */

  function restartApp() {
    // Reset state
    state = {
      stage:        0,
      entryChoice:  null,
      situation:    null,
      testType:     null,
      biggestFear:  null,
      priorHistory: null,
      county:       null,
    };

    // Clear stage container
    var stageContainer = els.stageContainer;
    if (stageContainer) {
      stageContainer.innerHTML = '';
    }

    // Reset progress
    if (els.progressContainer) {
      els.progressContainer.classList.remove('visible');
    }
    if (els.progressFill) els.progressFill.style.width = '0%';

    // Reset tone banner
    if (els.toneBanner) {
      els.toneBanner.style.display = 'none';
    }

    // Reset roadmap
    Animations.updateRoadmap([], 'stop', []);

    // Re-render stage 0
    renderStage(0);

    // Reset risk panel
    initRiskPanel();
    updateRiskPanel();

    // Scroll to top
    Animations.scrollToTop();
  }

  /* -------------------------------------------------- */
  /* Email Results                                      */
  /* -------------------------------------------------- */

  function emailResults() {
    var risk  = RiskCalculator.calculate(state);
    var flags = BranchingEngine.getFlags(state);

    var subject = encodeURIComponent('My Minnesota DWI Case Summary — Rochester DWI Law');
    var body = buildEmailBody(state, risk, flags);
    window.location.href = 'mailto:intake@khmnlaw.com?subject=' + subject + '&body=' + encodeURIComponent(body);
  }

  function buildEmailBody(state, risk, flags) {
    var lines = [
      'MY DWI CASE SUMMARY — Map My Minnesota DWI Path',
      '================================================',
      '',
      'SITUATION: ' + (state.situation === 'arrested' ? 'Arrested' : state.situation === 'cited' ? 'Cited and released' : 'Unsure'),
      'TEST TYPE: ' + (state.testType || 'Not answered'),
      'BIGGEST FEAR: ' + (state.biggestFear || 'Not answered'),
      'PRIOR HISTORY: ' + (state.priorHistory || 'Not answered'),
      'COUNTY: ' + (state.county || 'Not answered'),
      '',
      'RISK ASSESSMENT:',
      '  License Risk: ' + risk.licenseLabel + ' (' + risk.licenseScore + '%)',
      '  Jail Risk:    ' + risk.jailLabel + ' (' + risk.jailScore + '%)',
      '  Urgency:      ' + risk.urgency + '/10',
      '  Likely Charge: ' + (risk.likelyCharge || 'TBD'),
      '',
      'IMMEDIATE PRIORITY: ' + (risk.nextIssue || 'See next steps'),
      '',
      'Generated by: rochesterdwi.com/map-my-dwi-path',
      'DISCLAIMER: This is educational information only, not legal advice.',
      '',
      'Please call 507-625-5000 to discuss your case.',
      'K&H Minnesota Law | khmnlaw.com'
    ];
    return lines.join('\n');
  }

  /* -------------------------------------------------- */
  /* Helpers                                            */
  /* -------------------------------------------------- */

  function escAttr(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* -------------------------------------------------- */
  /* DOMContentLoaded bootstrap                         */
  /* -------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', init);

  // Public API (mainly for debugging)
  return {
    init:          init,
    getState:      function () { return state; },
    restartApp:    restartApp,
    updateRiskPanel: updateRiskPanel,
  };
}());
