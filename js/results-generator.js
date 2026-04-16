/**
 * results-generator.js
 * Dynamic results page creation for "Map My Minnesota DWI Path"
 * Generates personalized HTML for the results/reveal stage.
 */

/* global ResultsGenerator, BranchingEngine, RiskCalculator */

var ResultsGenerator = (function () {
  'use strict';

  /* -------------------------------------------------- */
  /* Helpers                                            */
  /* -------------------------------------------------- */

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function riskBadge(level, label) {
    return '<span class="risk-badge risk-badge-' + level + '">' + esc(label) + '</span>';
  }

  /* -------------------------------------------------- */
  /* Snapshot Banner                                    */
  /* -------------------------------------------------- */

  function buildSnapshotBanner(state, risk, tone, flags) {
    var chargeStr = risk.likelyCharge ? esc(risk.likelyCharge) : 'DWI (charge level TBD)';
    var situationStr = flags.wasArrested ? 'Arrested for DWI' : flags.wasCited ? 'Cited for DWI' : 'DWI Situation';
    var countyStr = state.county === 'olmsted'    ? ' — Olmsted County'
                  : state.county === 'blue-earth' ? ' — Blue Earth County'
                  : ' — Minnesota';

    var urgencyBannerText = '';
    if (tone === 'critical') {
      urgencyBannerText = '<div class="snapshot-urgency snapshot-urgency-critical">🚨 Critical Urgency — Act Today</div>';
    } else if (tone === 'urgent') {
      urgencyBannerText = '<div class="snapshot-urgency snapshot-urgency-urgent">⚠️ High Urgency — Act This Week</div>';
    } else if (tone === 'concerned') {
      urgencyBannerText = '<div class="snapshot-urgency snapshot-urgency-concerned">⚡ Elevated Risk — Review Your Options</div>';
    } else {
      urgencyBannerText = '<div class="snapshot-urgency snapshot-urgency-calm">✅ Options Available — Take Smart Action</div>';
    }

    var fearStr = '';
    if (state.biggestFear) {
      var fearLabels = {
        jail: 'Jail time', license: 'License loss', interlock: 'Ignition interlock',
        cost: 'Financial cost', job: 'Job impact', court: 'Going to court'
      };
      fearStr = '<div class="snapshot-fear">Your biggest concern: <strong>' + esc(fearLabels[state.biggestFear] || state.biggestFear) + '</strong></div>';
    }

    return '<div class="results-snapshot-banner">' +
      '<div class="results-badge">Your DWI Snapshot' + esc(countyStr) + '</div>' +
      '<h1 class="results-snapshot-title">' + esc(situationStr) + '</h1>' +
      urgencyBannerText +
      '<p class="results-snapshot-desc">Likely charge: <strong>' + chargeStr + '</strong></p>' +
      fearStr +
    '</div>';
  }

  /* -------------------------------------------------- */
  /* Risk Scorecard                                     */
  /* -------------------------------------------------- */

  function buildRiskScorecard(risk) {
    var urgencyInt = Math.round(risk.urgency);
    var urgencyLevel = urgencyInt >= 7 ? 'high' : urgencyInt >= 4 ? 'moderate' : 'low';

    return '<div class="results-section">' +
      '<h2 class="results-section-title"><span class="results-section-icon">📊</span>Risk Scorecard</h2>' +
      '<div class="risk-scorecard">' +
        '<div class="risk-score-item ' + risk.licenseLevel + '">' +
          '<div class="risk-score-label">License Risk</div>' +
          '<div class="risk-score-value">' + esc(risk.licenseLabel) + '</div>' +
          '<div class="risk-score-sub">' + risk.licenseScore + '% risk score</div>' +
        '</div>' +
        '<div class="risk-score-item ' + risk.jailLevel + '">' +
          '<div class="risk-score-label">Jail Risk</div>' +
          '<div class="risk-score-value">' + esc(risk.jailLabel) + '</div>' +
          '<div class="risk-score-sub">' + risk.jailScore + '% risk score</div>' +
        '</div>' +
        '<div class="risk-score-item ' + urgencyLevel + '">' +
          '<div class="risk-score-label">Urgency</div>' +
          '<div class="risk-score-value">' + urgencyInt + '/10</div>' +
          '<div class="risk-score-sub">' + esc(RiskCalculator.getUrgencyDesc(risk.urgency)) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* -------------------------------------------------- */
  /* Next 3 Steps                                       */
  /* -------------------------------------------------- */

  function buildNextSteps(state, risk, flags) {
    var steps = getNextStepsData(state, risk, flags);
    var stepsHtml = steps.slice(0, 3).map(function (step, i) {
      return '<div class="next-step-item">' +
        '<div class="next-step-number">' + (i + 1) + '</div>' +
        '<div class="next-step-content">' +
          '<div class="next-step-title">' + esc(step.title) + '</div>' +
          '<div class="next-step-desc">' + esc(step.desc) + '</div>' +
          (step.urgency ? '<span class="next-step-urgency urgency-' + step.urgency + '">' + esc(step.urgencyLabel) + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="results-section">' +
      '<h2 class="results-section-title"><span class="results-section-icon">✅</span>Your Next 3 Steps</h2>' +
      '<div class="next-steps-list">' + stepsHtml + '</div>' +
    '</div>';
  }

  function getNextStepsData(state, risk, flags) {
    var steps = [];

    // Step 1: Always license/legal action urgency
    if (flags.isRefusal) {
      steps.push({
        title: 'Challenge Your License Revocation NOW',
        desc: 'You have 7 days from the date of revocation to petition for an implied consent hearing. This window is non-negotiable — miss it and you lose the right to challenge. Contact an attorney today.',
        urgency: 'critical',
        urgencyLabel: '⏰ 7-DAY DEADLINE'
      });
    } else if (flags.wasArrested) {
      steps.push({
        title: 'Address Your License Status Immediately',
        desc: 'If your license was taken at arrest or you received a revocation notice, you likely have 7 days to request a hearing to challenge the revocation. Don\'t let this deadline pass.',
        urgency: 'critical',
        urgencyLabel: '⏰ 7-DAY WINDOW'
      });
    } else {
      steps.push({
        title: 'Confirm Your License Status Today',
        desc: 'Even if your license wasn\'t taken at the scene, a revocation may still occur. Check your paperwork for a DL-7 form and verify your driving privileges before driving.',
        urgency: 'high',
        urgencyLabel: '⚡ DO THIS TODAY'
      });
    }

    // Step 2: Document and preserve evidence
    steps.push({
      title: 'Document Everything You Remember',
      desc: 'Write down every detail from the stop: time, location, reason for the stop, what was said, field sobriety tests, conditions, and anything else. Memory fades fast — do this now.',
      urgency: 'high',
      urgencyLabel: '⚡ TIME SENSITIVE'
    });

    // Step 3: varies based on fear/situation
    if (flags.hasMultiplePriors) {
      steps.push({
        title: 'Secure Experienced DWI Representation',
        desc: 'With prior DWIs, you are facing felony charges and mandatory minimums. This is not the time for a public defender or a general practice attorney. DWI-specific representation is critical.',
        urgency: 'critical',
        urgencyLabel: '🚨 CRITICAL'
      });
    } else if (flags.fearIsLicense) {
      steps.push({
        title: 'Understand Your License Options',
        desc: 'Minnesota offers limited license options during revocation — work permit, limited license, or ignition interlock program. An attorney can help you pursue the option that keeps you driving.',
        urgency: 'normal',
        urgencyLabel: 'IMPORTANT'
      });
    } else if (flags.fearIsJob) {
      steps.push({
        title: 'Get Legal Guidance Before It Affects Work',
        desc: 'A DWI conviction can impact CDL holders immediately and affects many employment situations. Acting early — before a conviction — gives you the most options to protect your job.',
        urgency: 'high',
        urgencyLabel: '⚡ ACT EARLY'
      });
    } else if (flags.fearIsCost) {
      steps.push({
        title: 'Understand the True Cost of Waiting',
        desc: 'Without legal help, fines, fees, higher insurance, and lost income from license revocation typically exceed $10,000. An attorney can often reduce charges — making representation cost-effective.',
        urgency: 'normal',
        urgencyLabel: 'FINANCIAL IMPACT'
      });
    } else {
      steps.push({
        title: 'Save All Paperwork and Confirm Your Court Date',
        desc: 'Gather every document: citation, revocation notice, DL-7 form, bond papers. Confirm your court date on paper — do NOT miss it. A failure to appear triggers an automatic warrant and additional charges.',
        urgency: 'high',
        urgencyLabel: '⚡ DO NOT MISS COURT'
      });
    }

    return steps;
  }

  /* -------------------------------------------------- */
  /* Mistakes to Avoid                                  */
  /* -------------------------------------------------- */

  function buildMistakes(state, flags) {
    var mistakes = getMistakesData(state, flags);

    var html = mistakes.map(function (m) {
      return '<div class="mistake-item">' +
        '<div class="mistake-icon">🚫</div>' +
        '<div class="mistake-content">' +
          '<div class="mistake-title">' + esc(m.title) + '</div>' +
          '<div class="mistake-desc">' + esc(m.desc) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="results-section">' +
      '<h2 class="results-section-title"><span class="results-section-icon">⛔</span>Mistakes to Avoid</h2>' +
      '<div class="mistakes-list">' + html + '</div>' +
    '</div>';
  }

  function getMistakesData(state, flags) {
    var mistakes = [];

    // Most common mistake first
    mistakes.push({
      title: 'Waiting on the License Deadline',
      desc: 'The 7-day window to challenge your license revocation is the most commonly missed opportunity. Even if you plan to plead guilty to the DWI, you may still be able to challenge the license revocation separately.'
    });

    mistakes.push({
      title: 'Talking About Your Case',
      desc: 'Do not discuss your case with anyone except your attorney — not friends, family, coworkers, or on social media. Anything you say can be used against you. This includes text messages and direct messages.'
    });

    if (flags.isRefusal) {
      mistakes.push({
        title: 'Treating Refusal Like a Regular DWI',
        desc: 'Test refusal is a separate criminal charge with its own consequences, in addition to any DWI charge. The defense strategy is different — make sure your attorney understands both issues.'
      });
    }

    if (flags.isBloodTest) {
      mistakes.push({
        title: 'Waiting for Blood Results to Act',
        desc: 'Blood results take weeks. By the time you have results, valuable time for building your defense has already passed. The license challenge deadline won\'t wait for lab results either.'
      });
    }

    mistakes.push({
      title: 'Missing Your Court Date',
      desc: 'A failure to appear results in an automatic arrest warrant, additional criminal charges, and serious damage to your case. Put your court date somewhere you cannot miss it.'
    });

    if (flags.hasMultiplePriors) {
      mistakes.push({
        title: 'Underestimating the Seriousness',
        desc: 'With multiple priors, you are facing mandatory minimums that a judge has limited ability to reduce without a strong defense. "Just pleading guilty" is rarely the right answer here.'
      });
    }

    mistakes.push({
      title: 'Driving Without Confirming License Status',
      desc: 'Driving on a revoked license is a separate crime that adds charges and can result in vehicle forfeiture. Before driving, verify your current license status with the Minnesota DVS or your attorney.'
    });

    return mistakes.slice(0, 5); // cap at 5
  }

  /* -------------------------------------------------- */
  /* Timeline                                           */
  /* -------------------------------------------------- */

  function buildTimeline(state, risk, flags) {
    var items = getTimelineItems(state, risk, flags);

    var html = items.map(function (item) {
      return '<div class="timeline-item">' +
        '<div class="timeline-dot' + (item.urgent ? ' urgent' : '') + '">' + esc(item.icon) + '</div>' +
        '<div class="timeline-content">' +
          '<div class="timeline-period">' + esc(item.period) + '</div>' +
          '<div class="timeline-items">' +
            item.actions.map(function (a) {
              return '<div class="timeline-action">' + esc(a) + '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="results-section">' +
      '<h2 class="results-section-title"><span class="results-section-icon">📅</span>What\'s Coming — Your Timeline</h2>' +
      '<div class="timeline-list">' + html + '</div>' +
    '</div>';
  }

  function getTimelineItems(state, risk, flags) {
    var items = [];

    // 7 days
    var sevenDayActions = [];
    if (flags.isRefusal || flags.wasArrested) {
      sevenDayActions.push('File petition for implied consent hearing (license challenge)');
    }
    sevenDayActions.push('Write down all details about the stop and arrest');
    sevenDayActions.push('Contact a DWI attorney for emergency case review');
    sevenDayActions.push('Save and organize all paperwork');
    if (!flags.wasCited) {
      sevenDayActions.push('Do NOT drive until you confirm license status');
    }

    items.push({
      period: 'Within 7 Days',
      icon: '🔴',
      urgent: true,
      actions: sevenDayActions
    });

    // 30 days
    var thirtyDayActions = [];
    thirtyDayActions.push('Attend arraignment (first court appearance)');
    thirtyDayActions.push('Work with attorney on defense strategy');
    if (flags.isBloodTest) {
      thirtyDayActions.push('Monitor blood test results — additional charges possible');
    }
    if (flags.isRefusal || flags.wasArrested) {
      thirtyDayActions.push('Attend implied consent hearing (if requested)');
    }
    thirtyDayActions.push('Explore limited license / work permit options');

    items.push({
      period: 'Within 30 Days',
      icon: '🟡',
      urgent: false,
      actions: thirtyDayActions
    });

    // 90 days
    var ninetyDayActions = [];
    ninetyDayActions.push('Pre-trial motions filed (if applicable)');
    ninetyDayActions.push('Plea negotiations or trial preparation begins');
    if (flags.hasMultiplePriors) {
      ninetyDayActions.push('Mandatory sentencing evaluation (felony cases)');
    }
    ninetyDayActions.push('Complete any court-ordered chemical dependency evaluation');
    ninetyDayActions.push('Review all evidence with your attorney');

    items.push({
      period: 'Within 90 Days',
      icon: '🟢',
      urgent: false,
      actions: ninetyDayActions
    });

    return items;
  }

  /* -------------------------------------------------- */
  /* County-Specific Section                            */
  /* -------------------------------------------------- */

  function buildCountySection(state) {
    if (!state.county) return '';

    var content = getCountyContent(state.county);
    if (!content) return '';

    return '<div class="results-section">' +
      '<h2 class="results-section-title"><span class="results-section-icon">📍</span>Local to Your Area</h2>' +
      '<div class="county-info">' +
        '<div class="county-icon">' + esc(content.icon) + '</div>' +
        '<div class="county-content">' +
          '<div class="county-name">' + esc(content.name) + '</div>' +
          '<div class="county-desc">' + esc(content.desc) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function getCountyContent(county) {
    switch (county) {
      case 'olmsted':
        return {
          icon: '⚖️',
          name: 'Olmsted County — Third Judicial District',
          desc: 'Rochester / Olmsted County cases are heard at the Olmsted County Government Center. We know this courthouse, this court, and its procedures inside and out. Our Rochester office is minutes away, and we appear here regularly.'
        };
      case 'blue-earth':
        return {
          icon: '⚖️',
          name: 'Blue Earth County — Fifth Judicial District',
          desc: 'Blue Earth County cases are heard at the Blue Earth County Law Enforcement Center in Mankato. We serve clients throughout southern Minnesota including Blue Earth County. Contact us to discuss your specific situation.'
        };
      case 'other':
        return {
          icon: '📍',
          name: 'Southern Minnesota — We Cover Your County',
          desc: 'K&H Minnesota Law serves clients throughout southern Minnesota. Our attorneys are familiar with courts across the region. Call us to discuss your specific county\'s procedures and how we can help.'
        };
      default:
        return null;
    }
  }

  /* -------------------------------------------------- */
  /* Fear-Focused Section                               */
  /* -------------------------------------------------- */

  function buildFearSection(state, risk, flags) {
    if (!state.biggestFear) return '';

    var content = getFearContent(state.biggestFear, state, risk, flags);
    if (!content) return '';

    return '<div class="results-section">' +
      '<h2 class="results-section-title"><span class="results-section-icon">' + esc(content.icon) + '</span>' + esc(content.title) + '</h2>' +
      '<div class="fear-content">' +
        content.items.map(function (item) {
          return '<div class="fear-item">' +
            '<div class="fear-item-label">' + esc(item.label) + '</div>' +
            '<div class="fear-item-text">' + esc(item.text) + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function getFearContent(fear, state, risk, flags) {
    switch (fear) {
      case 'jail':
        return {
          icon: '🔒',
          title: 'Addressing Your Jail Concern',
          items: [
            {
              label: 'First offense (no priors)',
              text: 'First-offense DWI rarely results in active jail time in Minnesota with proper legal representation. Conditions like probation, fines, and education programs are far more common outcomes.'
            },
            {
              label: 'Second offense',
              text: 'A second DWI carries mandatory minimum of 30 days (can often be served as home monitoring). An attorney can help minimize this through negotiation and program participation.'
            },
            {
              label: 'Third+ offense',
              text: 'Felony DWI carries mandatory minimums of 180 days. However, programs like Challenge Incarceration may be available. Every day with an experienced attorney matters.'
            },
            {
              label: 'What helps most',
              text: 'Early intervention, showing responsibility, chemical dependency evaluation, and experienced legal representation consistently produce better jail outcomes.'
            }
          ]
        };

      case 'license':
        return {
          icon: '🚗',
          title: 'Protecting Your License',
          items: [
            {
              label: '7-day window is critical',
              text: 'If your license was revoked, you have 7 days to request an implied consent hearing. This is your main legal opportunity to challenge the revocation — don\'t miss it.'
            },
            {
              label: 'Limited license options',
              text: 'Minnesota offers work permits and limited licenses that allow driving for essential purposes during revocation periods. These require application and approval.'
            },
            {
              label: 'Ignition interlock program',
              text: 'The Ignition Interlock Program often allows full driving privileges earlier, in exchange for having a breathalyzer device installed. This may be worth considering.'
            },
            {
              label: 'Revocation periods',
              text: 'First offense: 90-day revocation. Second offense: 1 year. Test refusal: minimum 1 year. An attorney can help you navigate which options apply to your situation.'
            }
          ]
        };

      case 'interlock':
        return {
          icon: '🔑',
          title: 'Understanding Ignition Interlock',
          items: [
            {
              label: 'What it is',
              text: 'An ignition interlock device (IID) is a breathalyzer installed in your vehicle. You must blow into it before starting the car and periodically while driving. It does not affect normal driving if sober.'
            },
            {
              label: 'When it\'s required',
              text: 'In Minnesota, interlock is often required for second offenses and above, test refusal cases, and high BAC cases. It may also be offered as an option to restore driving privileges sooner.'
            },
            {
              label: 'The cost',
              text: 'Interlock devices typically cost $60–$90/month to lease and maintain. This is often less expensive than the cost of driving privileges lost without interlock.'
            },
            {
              label: 'The trade-off',
              text: 'While interlock can feel invasive, it often allows full driving privileges far sooner than waiting out a full revocation. For most people, the trade-off is worth it.'
            }
          ]
        };

      case 'cost':
        return {
          icon: '💰',
          title: 'Understanding the Real Costs',
          items: [
            {
              label: 'Without legal help',
              text: 'A DWI conviction typically costs $10,000–$20,000+ over 3–5 years: fines ($1,000–$3,000), insurance increases ($3,000–$8,000), license reinstatement fees ($680), and lost wages from license loss.'
            },
            {
              label: 'With legal representation',
              text: 'An experienced attorney can often reduce charges, avoid conviction, or negotiate better outcomes — saving far more in long-term costs than the attorney\'s fee.'
            },
            {
              label: 'Attorney fee context',
              text: 'DWI attorney fees typically range from $1,500–$5,000 for misdemeanors and $5,000–$15,000 for felonies. Compare this to $10,000–$20,000+ in total DWI costs without representation.'
            },
            {
              label: 'Free consultation',
              text: 'We offer a free 30-minute consultation. Call 507-625-5000 to discuss your case and get honest information about your options — before you decide anything.'
            }
          ]
        };

      case 'job':
        return {
          icon: '💼',
          title: 'Protecting Your Employment',
          items: [
            {
              label: 'CDL holders — urgent',
              text: 'For commercial driver\'s license holders, a DWI conviction — even in a personal vehicle — can result in immediate CDL disqualification. Action before conviction is critical.'
            },
            {
              label: 'Professional licenses',
              text: 'Certain professions (healthcare, law, education, finance) have licensing board reporting requirements. An attorney can advise on your specific profession\'s rules and help minimize impact.'
            },
            {
              label: 'General employment',
              text: 'Many employers conduct background checks. A DWI conviction appears on your record. Reducing or avoiding a conviction through legal representation gives you the best employment protection.'
            },
            {
              label: 'Expungement',
              text: 'In some cases, Minnesota allows expungement of DWI records after a waiting period. An attorney can advise whether you may be eligible and how to position yourself for it.'
            }
          ]
        };

      case 'court':
        return {
          icon: '⚖️',
          title: 'Going to Court — What to Expect',
          items: [
            {
              label: 'Arraignment (first appearance)',
              text: 'Your first court date is the arraignment — you enter a not guilty plea and bail conditions are reviewed. This is routine. You don\'t have to decide anything here.'
            },
            {
              label: 'Pre-trial process',
              text: 'Between arraignment and trial, your attorney reviews evidence, files motions, and negotiates with prosecutors. Most cases resolve through negotiated pleas before trial.'
            },
            {
              label: 'What to wear / how to act',
              text: 'Dress professionally and respectfully. Address the judge as "Your Honor." Do not speak unless spoken to directly. Follow your attorney\'s guidance.'
            },
            {
              label: 'Typical timeline',
              text: 'DWI cases in Minnesota typically resolve within 3–9 months. Felony cases may take longer. Your attorney can give you a realistic timeline for your specific situation.'
            }
          ]
        };

      default:
        return null;
    }
  }

  /* -------------------------------------------------- */
  /* CTA Section                                        */
  /* -------------------------------------------------- */

  function buildCTA(state, tone) {
    var urgencyLine = '';
    if (tone === 'critical' || tone === 'urgent') {
      urgencyLine = '<p class="results-cta-sub">⏰ Time-sensitive situation — don\'t wait to get answers.</p>';
    } else {
      urgencyLine = '<p class="results-cta-sub">Free 30-minute consultation. No pressure. Just answers.</p>';
    }

    var countyNote = '';
    if (state.county === 'olmsted') {
      countyNote = '<p class="results-cta-sub" style="font-size:13px;opacity:0.6;">Rochester office — 5 minutes from Olmsted County Courthouse</p>';
    }

    return '<div class="results-cta">' +
      '<h2 class="results-cta-title">Get Your Free Consultation</h2>' +
      urgencyLine +
      countyNote +
      '<div class="cta-buttons">' +
        '<a href="tel:5076255000" class="btn-primary-cta">📞 Call 507-625-5000</a>' +
        '<a href="https://khmnlaw.com/contact-us/" target="_blank" rel="noopener" class="btn-secondary-cta">💬 Send a Message</a>' +
      '</div>' +
    '</div>';
  }

  /* -------------------------------------------------- */
  /* Print / Save Actions                               */
  /* -------------------------------------------------- */

  function buildPrintActions() {
    return '<div class="print-actions">' +
      '<button class="btn-action" onclick="window.print()">🖨️ Print Results</button>' +
      '<button class="btn-action" id="email-results-btn">✉️ Email Results</button>' +
      '<button class="btn-action" id="restart-btn">↩️ Start Over</button>' +
    '</div>';
  }

  /* -------------------------------------------------- */
  /* Legal Disclaimer                                   */
  /* -------------------------------------------------- */

  function buildDisclaimer() {
    return '<div class="legal-disclaimer">' +
      '<strong>⚖️ Important Legal Disclaimer:</strong> This tool provides <strong>educational information only</strong> and does not constitute legal advice. ' +
      'The risk assessments and next steps shown are general information based on typical Minnesota DWI scenarios — your actual situation may differ significantly. ' +
      'No attorney-client relationship is created by using this tool. ' +
      'Contact a licensed Minnesota DWI attorney immediately for advice specific to your case. ' +
      'K&amp;H Minnesota Law | <a href="https://khmnlaw.com" target="_blank" rel="noopener">khmnlaw.com</a> | ' +
      '<a href="tel:5076255000">507-625-5000</a> | <a href="mailto:intake@khmnlaw.com">intake@khmnlaw.com</a>' +
    '</div>';
  }

  /* -------------------------------------------------- */
  /* Fear Section Supporting CSS (injected once)        */
  /* -------------------------------------------------- */

  function injectFearStyles() {
    if (document.getElementById('fear-styles')) return;
    var style = document.createElement('style');
    style.id = 'fear-styles';
    style.textContent = [
      '.fear-item { padding: 12px 0; border-bottom: 1px solid var(--border-light); }',
      '.fear-item:last-child { border-bottom: none; padding-bottom: 0; }',
      '.fear-item-label { font-size: 13px; font-weight: 700; color: var(--brand-primary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }',
      '.fear-item-text { font-size: 14px; color: var(--text-body); line-height: 1.5; }',
      '.snapshot-urgency { display: inline-block; padding: 6px 14px; border-radius: 99px; font-size: 13px; font-weight: 700; margin: 10px 0; }',
      '.snapshot-urgency-critical { background: rgba(239,68,68,0.25); color: #fca5a5; }',
      '.snapshot-urgency-urgent   { background: rgba(245,158,11,0.25); color: #fcd34d; }',
      '.snapshot-urgency-concerned { background: rgba(59,130,246,0.2); color: #93c5fd; }',
      '.snapshot-urgency-calm     { background: rgba(34,197,94,0.2); color: #86efac; }',
      '.snapshot-fear { font-size: 14px; color: rgba(255,255,255,0.7); margin-top: 6px; }',
      '.snapshot-fear strong { color: rgba(255,255,255,0.95); }',
      '.risk-badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; }',
      '.risk-badge-high     { background: var(--risk-high-bg); color: var(--risk-high); }',
      '.risk-badge-moderate { background: var(--risk-moderate-bg); color: var(--risk-moderate); }',
      '.risk-badge-low      { background: var(--risk-low-bg); color: var(--risk-low); }',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* -------------------------------------------------- */
  /* Main generate() function                           */
  /* -------------------------------------------------- */

  function generate(state, risk, tone, flags) {
    injectFearStyles();

    var html = '<div class="results-page">';

    html += buildSnapshotBanner(state, risk, tone, flags);
    html += buildRiskScorecard(risk);
    html += buildNextSteps(state, risk, flags);
    html += buildFearSection(state, risk, flags);
    html += buildMistakes(state, flags);
    html += buildTimeline(state, risk, flags);
    html += buildCountySection(state);
    html += buildCTA(state, tone);
    html += buildPrintActions();
    html += buildDisclaimer();

    html += '</div>';
    return html;
  }

  // Public API
  return {
    generate:           generate,
    getNextStepsData:   getNextStepsData,
    getMistakesData:    getMistakesData,
    getTimelineItems:   getTimelineItems,
    getCountyContent:   getCountyContent,
  };
}());
