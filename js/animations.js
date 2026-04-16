/**
 * animations.js
 * Smooth transitions, roadmap updates, and risk bar animations
 * for "Map My Minnesota DWI Path"
 */

/* global Animations */

var Animations = (function () {
  'use strict';

  /* -------------------------------------------------- */
  /* Stage transitions                                  */
  /* -------------------------------------------------- */

  var isTransitioning = false;

  /**
   * Animate transition between two stage elements
   * @param {HTMLElement} fromEl - currently visible stage
   * @param {HTMLElement} toEl   - stage to show
   * @param {Function} [onDone]  - callback after transition
   */
  function transitionStage(fromEl, toEl, onDone) {
    if (isTransitioning) return;
    isTransitioning = true;

    // Prepare toEl
    toEl.style.opacity = '0';
    toEl.style.transform = 'translateX(40px)';
    toEl.style.display = 'flex';
    toEl.classList.remove('exit-left', 'active');

    // Exit current stage
    if (fromEl && fromEl !== toEl) {
      fromEl.style.transition = 'opacity 220ms ease, transform 220ms ease';
      fromEl.style.opacity = '0';
      fromEl.style.transform = 'translateX(-40px)';

      setTimeout(function () {
        fromEl.style.display = 'none';
        fromEl.classList.remove('active');

        // Enter new stage
        enterStage(toEl, onDone);
      }, 230);
    } else {
      enterStage(toEl, onDone);
    }
  }

  function enterStage(el, onDone) {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    el.style.display = 'flex';

    // Force reflow
    el.offsetHeight; // eslint-disable-line no-unused-expressions

    el.style.transition = 'opacity 300ms ease, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
    el.classList.add('active');

    setTimeout(function () {
      isTransitioning = false;
      el.style.transition = '';
      if (typeof onDone === 'function') onDone();
    }, 320);
  }

  /**
   * Transition to results page with a reveal animation
   * @param {HTMLElement} fromEl
   * @param {HTMLElement} toEl
   * @param {Function} [onDone]
   */
  function revealResults(fromEl, toEl, onDone) {
    if (isTransitioning) return;
    isTransitioning = true;

    // Exit current
    if (fromEl) {
      fromEl.style.transition = 'opacity 280ms ease, transform 280ms ease';
      fromEl.style.opacity = '0';
      fromEl.style.transform = 'translateY(-20px)';
    }

    setTimeout(function () {
      if (fromEl) {
        fromEl.style.display = 'none';
        fromEl.classList.remove('active');
      }

      toEl.style.display = 'block';
      toEl.style.opacity = '0';
      toEl.style.transform = 'translateY(30px)';

      // Force reflow
      toEl.offsetHeight; // eslint-disable-line no-unused-expressions

      toEl.style.transition = 'opacity 500ms ease, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)';
      toEl.style.opacity = '1';
      toEl.style.transform = 'translateY(0)';
      toEl.classList.add('active');

      setTimeout(function () {
        isTransitioning = false;
        toEl.style.transition = '';
        if (typeof onDone === 'function') onDone();
      }, 520);
    }, 300);
  }

  /* -------------------------------------------------- */
  /* Roadmap updates                                    */
  /* -------------------------------------------------- */

  /**
   * Update roadmap node states (both desktop and mobile)
   * @param {Array<string>} completedNodes - node IDs that are completed
   * @param {string}        currentNode    - currently active node ID
   * @param {Array<string>} alertNodes     - node IDs in alert state
   */
  function updateRoadmap(completedNodes, currentNode, alertNodes) {
    // Update desktop roadmap
    var nodes = document.querySelectorAll('.roadmap-node');
    nodes.forEach(function (node) {
      var id = node.getAttribute('data-node');
      updateNodeState(node, id, completedNodes, currentNode, alertNodes);
    });

    // Update mobile roadmap
    var mobileNodes = document.querySelectorAll('.roadmap-mobile-node');
    mobileNodes.forEach(function (node) {
      var id = node.getAttribute('data-node');
      updateNodeState(node, id, completedNodes, currentNode, alertNodes);
    });

    // Update mobile connectors
    var connectors = document.querySelectorAll('.roadmap-mobile-connector');
    var nodeOrder = ['stop', 'test', 'license', 'court', 'outcome', 'next'];
    connectors.forEach(function (connector, i) {
      var nodeId = nodeOrder[i];
      if (completedNodes.includes(nodeId)) {
        connector.classList.add('active');
      } else {
        connector.classList.remove('active');
      }
    });
  }

  function updateNodeState(node, id, completedNodes, currentNode, alertNodes) {
    // Remove all state classes
    node.classList.remove('inactive', 'current', 'completed', 'alert');

    if (alertNodes && alertNodes.includes(id)) {
      node.classList.add('alert');
    } else if (completedNodes.includes(id)) {
      node.classList.add('completed');
    } else if (id === currentNode) {
      node.classList.add('current');
    } else {
      node.classList.add('inactive');
    }
  }

  /* -------------------------------------------------- */
  /* Risk bar animations                                */
  /* -------------------------------------------------- */

  /**
   * Animate a risk bar to a target width and color class
   * @param {HTMLElement|string} barEl - element or ID
   * @param {number}             targetPct - 0–100
   * @param {string}             colorClass - 'low' | 'moderate' | 'high'
   */
  function animateRiskBar(barEl, targetPct, colorClass) {
    if (typeof barEl === 'string') {
      barEl = document.getElementById(barEl);
    }
    if (!barEl) return;

    // Remove loading state
    barEl.classList.remove('loading');
    barEl.classList.remove('low', 'moderate', 'high');

    // Force reflow to reset transition if needed
    barEl.offsetHeight; // eslint-disable-line no-unused-expressions

    barEl.classList.add(colorClass);
    barEl.style.width = Math.round(targetPct) + '%';
  }

  /**
   * Animate the urgency score number (count up)
   * @param {HTMLElement|string} el
   * @param {number}             targetVal
   * @param {string}             className - CSS class for coloring
   */
  function animateUrgencyScore(el, targetVal, className) {
    if (typeof el === 'string') {
      el = document.getElementById(el);
    }
    if (!el) return;

    var startVal  = parseFloat(el.textContent) || 0;
    var targetNum = parseFloat(targetVal) || 0;
    var duration  = 600; // ms
    var startTime = null;
    var formatted = Number.isInteger(targetNum) ? targetNum : targetNum.toFixed(1);

    // Remove old class, add new
    el.classList.remove('score-low', 'score-moderate', 'score-high', 'score-unknown');
    el.classList.add(className || 'score-unknown');

    if (startVal === targetNum) return;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out
      var eased   = 1 - Math.pow(1 - progress, 3);
      var current = startVal + (targetNum - startVal) * eased;
      el.textContent = Number.isInteger(targetNum) ? Math.round(current) : current.toFixed(1);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatted;
        el.classList.add('animating');
        setTimeout(function () { el.classList.remove('animating'); }, 400);
      }
    }

    requestAnimationFrame(step);
  }

  /**
   * Flash a risk info item to indicate it changed
   * @param {HTMLElement|string} el
   */
  function flashInfoItem(el) {
    if (typeof el === 'string') {
      el = document.getElementById(el);
    }
    if (!el) return;
    el.classList.remove('flashing');
    el.offsetHeight; // eslint-disable-line no-unused-expressions
    el.classList.add('flashing');
    setTimeout(function () { el.classList.remove('flashing'); }, 600);
  }

  /* -------------------------------------------------- */
  /* Progress bar                                       */
  /* -------------------------------------------------- */

  /**
   * Animate progress bar to a percentage
   * @param {number} pct - 0–100
   */
  function setProgress(pct) {
    var fill = document.getElementById('progress-fill');
    if (fill) {
      fill.style.width = Math.round(pct) + '%';
    }
  }

  /* -------------------------------------------------- */
  /* Back button pulse (briefly highlight)              */
  /* -------------------------------------------------- */

  function pulseElement(el) {
    if (!el) return;
    el.style.transition = 'transform 150ms ease';
    el.style.transform = 'scale(1.04)';
    setTimeout(function () {
      el.style.transform = '';
    }, 180);
  }

  /* -------------------------------------------------- */
  /* Card "selected" micro-animation                    */
  /* -------------------------------------------------- */

  function selectCard(cardEl) {
    if (!cardEl) return;
    cardEl.classList.add('selecting');
    // Clear other selected
    var siblings = cardEl.closest('.card-grid');
    if (siblings) {
      siblings.querySelectorAll('.answer-card').forEach(function (c) {
        if (c !== cardEl) c.classList.remove('selected');
      });
    }
    cardEl.classList.add('selected');
    setTimeout(function () {
      cardEl.classList.remove('selecting');
    }, 350);
  }

  /* -------------------------------------------------- */
  /* Mobile risk strip update                           */
  /* -------------------------------------------------- */

  /**
   * Update the mobile risk strip values
   * @param {Object} risk - from RiskCalculator
   */
  function updateMobileRisk(risk) {
    var licenseEl = document.getElementById('mobile-license-val');
    var jailEl    = document.getElementById('mobile-jail-val');
    var urgencyEl = document.getElementById('mobile-urgency-val');

    if (licenseEl) {
      licenseEl.textContent = risk.hasData ? risk.licenseLabel : '—';
      licenseEl.className = 'risk-mobile-value ' + (risk.hasData ? risk.licenseLevel : 'unknown');
    }
    if (jailEl) {
      jailEl.textContent = risk.hasData ? risk.jailLabel : '—';
      jailEl.className = 'risk-mobile-value ' + (risk.hasData ? risk.jailLevel : 'unknown');
    }
    if (urgencyEl) {
      urgencyEl.textContent = risk.hasData ? (Math.round(risk.urgency) + '/10') : '—';
      urgencyEl.className = 'risk-mobile-value ' + (risk.hasData ? risk.urgencyClass.replace('score-', '') : 'unknown');
    }
  }

  /* -------------------------------------------------- */
  /* Scroll to top of main content                      */
  /* -------------------------------------------------- */

  function scrollToTop() {
    var main = document.getElementById('main-content');
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Public API
  return {
    transitionStage:    transitionStage,
    revealResults:      revealResults,
    updateRoadmap:      updateRoadmap,
    animateRiskBar:     animateRiskBar,
    animateUrgencyScore: animateUrgencyScore,
    flashInfoItem:      flashInfoItem,
    setProgress:        setProgress,
    pulseElement:       pulseElement,
    selectCard:         selectCard,
    updateMobileRisk:   updateMobileRisk,
    scrollToTop:        scrollToTop,
  };
}());
