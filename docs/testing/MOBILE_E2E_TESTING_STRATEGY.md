# Mobile E2E Testing Strategy for TERP Cannabis ERP System

**Version:** 1.0  
**Date:** November 24, 2025  
**Status:** DRAFT - Ready for Execution  
**Author:** Autonomous Testing Agent

---

## Executive Summary

This document outlines a comprehensive strategy for conducting full E2E testing of the TERP Cannabis ERP System on mobile devices, achieving the same thoroughness and coverage as the desktop testing (42 protocols, 100% coverage) while accounting for mobile-specific considerations.

### Key Objectives

1. **100% Protocol Coverage** - Execute all 42 test protocols from the Master Test Suite on mobile
2. **Mobile-Specific Testing** - Validate touch interactions, responsive design, and mobile UX
3. **Cross-Device Validation** - Test across multiple viewport sizes and orientations
4. **Performance Testing** - Verify mobile performance, load times, and data usage
5. **Bug Documentation** - Identify and document mobile-specific bugs separately from desktop bugs

---

## Mobile Testing Capabilities Assessment

### Browser Mobile Emulation

The Chromium browser in the sandbox supports mobile device emulation with the following capabilities:

**Available Features:**
- ✅ Mobile viewport emulation (various device sizes)
- ✅ Touch event simulation
- ✅ Device orientation (portrait/landscape)
- ✅ User agent spoofing (mobile browsers)
- ✅ Network throttling (3G, 4G, offline)
- ✅ Geolocation simulation
- ✅ Device pixel ratio adjustment

**Limitations:**
- ⚠️ Not true mobile hardware (emulation only)
- ⚠️ Cannot test native mobile features (camera, NFC, etc.)
- ⚠️ May not catch all mobile browser quirks

### Recommended Approach

**Primary Method:** Browser mobile emulation for comprehensive testing  
**Secondary Method:** Real device testing for validation (manual or via cloud services)

---

## Mobile Testing Strategy

### Phase 1: Mobile Emulation Setup

#### 1.1 Device Profiles to Test

Test across 3 representative device profiles covering the market:

**Profile 1: Small Phone (iPhone SE)**
- Viewport: 375x667px
- Device Pixel Ratio: 2
- User Agent: iPhone
- Use Case: Minimum viable mobile experience

**Profile 2: Standard Phone (iPhone 12/13)**
- Viewport: 390x844px
- Device Pixel Ratio: 3
- User Agent: iPhone
- Use Case: Most common mobile device

**Profile 3: Large Phone/Tablet (iPad Mini)**
- Viewport: 768x1024px
- Device Pixel Ratio: 2
- User Agent: iPad
- Use Case: Tablet experience, landscape testing

#### 1.2 Orientation Testing

For each device profile, test both:
- **Portrait Mode** (primary) - All 42 protocols
- **Landscape Mode** (secondary) - Critical workflows only (10-15 protocols)

#### 1.3 Network Conditions

Test under realistic mobile network conditions:
- **Fast 4G** (primary testing) - 4Mbps down, 3Mbps up, 20ms latency
- **Slow 3G** (performance testing) - 400Kbps down, 400Kbps up, 400ms latency
- **Offline** (resilience testing) - Test offline behavior and error handling

---

### Phase 2: Mobile-Specific Test Protocols

Extend the existing 42 protocols with mobile-specific considerations:

#### 2.1 Mobile Interaction Testing (New Protocol: TS-M01)

**Test:** Verify all touch interactions work correctly on mobile

**Specific Tests:**
- Tap targets are at least 44x44px (iOS) or 48x48dp (Android)
- No hover-dependent functionality (hover doesn't exist on mobile)
- Swipe gestures work where implemented
- Long-press interactions function correctly
- Multi-touch gestures (pinch-to-zoom) behave appropriately
- Touch feedback is immediate and clear

**Expected Behavior:**
- All buttons and links are easily tappable
- No accidental taps due to small touch targets
- Touch interactions feel responsive (<100ms feedback)

#### 2.2 Mobile Navigation Testing (New Protocol: TS-M02)

**Test:** Verify navigation is optimized for mobile

**Specific Tests:**
- Sidebar collapses to hamburger menu on mobile
- Navigation menu is accessible and usable
- Back button behavior is correct
- Deep links work on mobile
- Breadcrumbs are mobile-friendly or hidden
- Bottom navigation (if implemented) works correctly

**Expected Behavior:**
- Navigation doesn't block content
- Menu opens/closes smoothly
- Navigation is thumb-friendly (reachable with one hand)

#### 2.3 Mobile Form Input Testing (New Protocol: TS-M03)

**Test:** Verify forms are mobile-optimized

**Specific Tests:**
- Correct keyboard types appear (numeric, email, tel, etc.)
- Input fields are large enough to tap
- Labels are visible when input is focused
- Autocomplete works correctly
- Date/time pickers are mobile-friendly
- File upload works on mobile
- Form validation messages are visible

**Expected Behavior:**
- Forms are easy to fill on mobile
- No keyboard covering input fields
- Smooth scrolling to next field

#### 2.4 Mobile Performance Testing (New Protocol: TS-M04)

**Test:** Verify performance is acceptable on mobile

**Specific Tests:**
- Initial page load <3 seconds on 4G
- Time to Interactive (TTI) <5 seconds
- No layout shifts during load (CLS <0.1)
- Smooth scrolling (60fps)
- No janky animations
- Images load progressively
- API responses are cached appropriately

**Expected Behavior:**
- App feels fast and responsive
- No long loading spinners
- Smooth transitions between pages

#### 2.5 Mobile Responsive Design Testing (New Protocol: TS-M05)

**Test:** Verify responsive design works across viewport sizes

**Specific Tests:**
- Layout adapts correctly to different screen sizes
- No horizontal scrolling (unless intentional)
- Text is readable without zooming (min 16px)
- Tables are responsive (scroll or stack)
- Charts/graphs are mobile-optimized
- Modals/dialogs fit on screen
- Images scale correctly

**Expected Behavior:**
- Content is readable and accessible on all devices
- No broken layouts or overflow
- Consistent visual hierarchy

---

### Phase 3: Execution Plan

#### 3.1 Test Execution Order

Execute tests in this order for efficiency:

**Round 1: Standard Phone Portrait (Primary)**
- Device: iPhone 12 (390x844px)
- Network: Fast 4G
- Execute: All 42 protocols + 5 mobile-specific protocols
- Duration: ~6-8 hours

**Round 2: Small Phone Portrait (Minimum Viable)**
- Device: iPhone SE (375x667px)
- Network: Fast 4G
- Execute: Critical workflows only (20 protocols)
- Duration: ~3-4 hours

**Round 3: Tablet Portrait (Large Screen)**
- Device: iPad Mini (768x1024px)
- Network: Fast 4G
- Execute: All 42 protocols (verify tablet experience)
- Duration: ~6-8 hours

**Round 4: Landscape Testing (Secondary)**
- Device: iPhone 12 (844x390px)
- Network: Fast 4G
- Execute: Critical workflows only (15 protocols)
- Duration: ~2-3 hours

**Round 5: Performance Testing (Slow Network)**
- Device: iPhone 12 (390x844px)
- Network: Slow 3G
- Execute: Critical workflows only (10 protocols)
- Duration: ~2-3 hours

**Total Estimated Time:** 19-26 hours

#### 3.2 Test Automation Approach

**Browser Configuration:**
```javascript
// Mobile device emulation settings for Chromium
const mobileDevices = {
  iphoneSE: {
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true
  },
  iphone12: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true
  },
  ipadMini: {
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true
  }
};

// Network throttling profiles
const networkProfiles = {
  fast4G: {
    downloadThroughput: 4 * 1024 * 1024 / 8, // 4Mbps
    uploadThroughput: 3 * 1024 * 1024 / 8,   // 3Mbps
    latency: 20 // 20ms
  },
  slow3G: {
    downloadThroughput: 400 * 1024 / 8,      // 400Kbps
    uploadThroughput: 400 * 1024 / 8,        // 400Kbps
    latency: 400 // 400ms
  }
};
```

#### 3.3 Browser Tool Usage

Use browser console to enable mobile emulation:

```javascript
// Enable mobile emulation via Chrome DevTools Protocol
await browser_console_exec(`
  // Set device metrics
  chrome.deviceMetrics.setDeviceMetricsOverride({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844
  });
  
  // Enable touch events
  chrome.emulation.setTouchEmulationEnabled({
    enabled: true,
    maxTouchPoints: 5
  });
  
  // Set user agent
  chrome.network.setUserAgentOverride({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  });
`);
```

---

### Phase 4: Mobile-Specific Bug Classification

#### 4.1 Bug Categories

Classify mobile bugs separately from desktop bugs:

**Category M1: Mobile Layout Issues**
- Broken responsive design
- Horizontal scrolling
- Content overflow
- Incorrect spacing/padding

**Category M2: Mobile Interaction Issues**
- Touch targets too small
- Hover-dependent functionality
- Broken gestures
- Unresponsive buttons

**Category M3: Mobile Performance Issues**
- Slow page loads
- Janky animations
- Layout shifts
- Memory leaks

**Category M4: Mobile Navigation Issues**
- Broken hamburger menu
- Navigation not accessible
- Back button issues
- Deep link problems

**Category M5: Mobile Form Issues**
- Wrong keyboard types
- Input fields too small
- Validation not visible
- Form submission issues

#### 4.2 Bug Naming Convention

Use "BUG-M" prefix for mobile-specific bugs:

- **BUG-M001:** First mobile bug
- **BUG-M002:** Second mobile bug
- etc.

If a desktop bug also affects mobile, note it in the bug description but don't create a duplicate.

---

### Phase 5: Documentation Requirements

#### 5.1 Test Results Documentation

For each testing round, create:

**Mobile Test Results Document:**
```
docs/testing/MOBILE_TEST_RESULTS_[DEVICE]_[DATE].md
```

**Contents:**
- Device profile and configuration
- Network conditions
- Test execution log
- Screenshots of issues
- Bug reports
- Pass/fail summary

#### 5.2 Mobile Bug Reports

For each mobile bug, document:

**Bug Report Template:**
```markdown
### BUG-M[XXX]: [Bug Title]

**Priority:** P0/P1/P2  
**Category:** M1/M2/M3/M4/M5  
**Device:** iPhone 12 (390x844px)  
**Orientation:** Portrait  
**Network:** Fast 4G  

**Description:**
[Detailed description of the bug]

**Steps to Reproduce:**
1. Open TERP on mobile device
2. Navigate to [page]
3. Perform [action]
4. Observe [issue]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshot:**
[Path to screenshot]

**Console Errors:**
[Any console errors]

**Impact:**
[How this affects mobile users]

**Recommendation:**
[Suggested fix]
```

#### 5.3 Mobile Testing Summary Report

Create final summary report:

```
docs/testing/MOBILE_E2E_TESTING_FINAL_REPORT.md
```

**Contents:**
- Executive summary
- Test coverage metrics (by device)
- Pass/fail rates (by device)
- Mobile-specific bugs found
- Desktop bugs that also affect mobile
- Performance metrics
- Recommendations
- Mobile readiness assessment

---

## Mobile Testing Checklist

### Pre-Testing Setup

- [ ] Review desktop test results and known bugs
- [ ] Ensure test data is populated
- [ ] Configure browser mobile emulation
- [ ] Set up network throttling
- [ ] Create testing documentation templates
- [ ] Review mobile-specific protocols

### During Testing

- [ ] Test on iPhone SE (375x667px) portrait
- [ ] Test on iPhone 12 (390x844px) portrait
- [ ] Test on iPad Mini (768x1024px) portrait
- [ ] Test on iPhone 12 (844x390px) landscape
- [ ] Test with Fast 4G network
- [ ] Test with Slow 3G network
- [ ] Document all mobile-specific bugs
- [ ] Take screenshots of issues
- [ ] Record console errors
- [ ] Note performance issues

### Post-Testing

- [ ] Compile all test results
- [ ] Create mobile bug reports
- [ ] Update Master Roadmap with mobile bugs
- [ ] Create mobile testing summary report
- [ ] Compare mobile vs desktop results
- [ ] Provide mobile readiness assessment
- [ ] Commit all documentation to repository

---

## Mobile Testing Protocols Matrix

### Protocol Coverage by Device

| Protocol | iPhone SE | iPhone 12 | iPad Mini | Landscape | Slow 3G |
|----------|-----------|-----------|-----------|-----------|---------|
| TS-001 Global Shortcuts | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-002 Theme Toggle | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-1.1 Authentication | ✅ | ✅ | ✅ | ✅ | ✅ |
| TS-1.2 VIP Portal | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-2.1 Dashboard KPIs | ✅ | ✅ | ✅ | ✅ | ✅ |
| TS-2.2 Analytics | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-3.1 Inventory Search | ✅ | ✅ | ✅ | ✅ | ✅ |
| TS-3.2 Batch Lifecycle | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-3.3 Location Mgmt | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-4.1 Chart of Accounts | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-4.2 Accounts Receivable | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-4.3 Accounts Payable | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-5.1 Pricing Engine | ✅ | ✅ | ✅ | ✅ | ✅ |
| TS-5.2 Sales Sheets | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-5.3 Order Flow | ✅ | ✅ | ✅ | ✅ | ✅ |
| TS-6.1 Client Profiles | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-6.2 Matchmaking | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-7.1 Vendor Mgmt | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-7.2 Purchase Orders | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-8.1 Calendar | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| TS-8.2 Task Mgmt | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-9.1 COGS Settings | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-9.2 RBAC | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-10.1 VIP Catalog | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-10.2 VIP Order | ✅ | ✅ | ✅ | ✅ | ✅ |
| TS-11.1 404 Handling | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-11.2 Data Persistence | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| TS-11.3 Network Failure | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| TS-12.1 Workflow DND | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-12.2 Status Migration | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-13.1 Mentions | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-13.2 Keyboard Nav | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-14.1 Returns Forms | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-14.2 Restock Logic | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-15.1 VIP Saved Views | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-15.2 VIP Interest List | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| TS-15.3 VIP Price Alerts | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **Mobile-Specific** |
| TS-M01 Touch Interactions | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| TS-M02 Mobile Navigation | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| TS-M03 Form Input | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| TS-M04 Performance | ✅ | ✅ | ✅ | ✅ | ✅ |
| TS-M05 Responsive Design | ✅ | ✅ | ✅ | ✅ | ⚠️ |

**Legend:**
- ✅ = Full testing required
- ⚠️ = Partial testing (critical workflows only)
- ❌ = Skip (not applicable)

---

## Expected Mobile-Specific Issues

Based on common mobile web app challenges, expect to find:

### High Probability Issues

1. **Touch Target Size** - Buttons/links too small for mobile (< 44px)
2. **Horizontal Scrolling** - Tables or wide content causing horizontal scroll
3. **Keyboard Covering Inputs** - Form inputs hidden by mobile keyboard
4. **Hamburger Menu Issues** - Navigation menu not working or hard to access
5. **Performance on Slow Networks** - Long load times on 3G
6. **Text Too Small** - Font sizes < 16px requiring zoom
7. **Modal/Dialog Overflow** - Modals larger than viewport
8. **Hover-Dependent Features** - Features that only work on hover

### Medium Probability Issues

9. **Layout Shifts** - Content jumping during load (CLS issues)
10. **Janky Scrolling** - Scroll performance issues
11. **Wrong Keyboard Types** - Text keyboard for phone/email fields
12. **Image Scaling** - Images not optimized for mobile
13. **Chart Responsiveness** - Charts not mobile-friendly
14. **Table Responsiveness** - Tables not scrollable or stackable
15. **Touch Gesture Conflicts** - Swipe gestures conflicting with browser

### Low Probability Issues

16. **Memory Leaks** - App slowing down over time on mobile
17. **Orientation Change Bugs** - Layout breaks on rotation
18. **Deep Link Issues** - Links not working on mobile
19. **Back Button Issues** - Browser back button not working correctly
20. **Offline Behavior** - Poor offline error handling

---

## Mobile Testing Success Criteria

### Minimum Acceptance Criteria

- ✅ All 42 protocols execute successfully on iPhone 12 (390x844px) portrait
- ✅ All mobile-specific protocols (TS-M01 to TS-M05) pass
- ✅ No P0 mobile-specific bugs found
- ✅ < 5 P1 mobile-specific bugs found
- ✅ Touch targets are all ≥ 44px
- ✅ No horizontal scrolling on any page
- ✅ Page load time < 3 seconds on Fast 4G
- ✅ Time to Interactive < 5 seconds on Fast 4G
- ✅ All forms are usable on mobile
- ✅ Navigation is accessible and functional

### Ideal Acceptance Criteria

- ✅ All protocols pass on all 3 device profiles
- ✅ All protocols pass in landscape mode
- ✅ No mobile-specific bugs found
- ✅ Page load time < 2 seconds on Fast 4G
- ✅ Time to Interactive < 3 seconds on Fast 4G
- ✅ Smooth 60fps scrolling and animations
- ✅ App works offline with graceful degradation
- ✅ All touch interactions feel native-like
- ✅ Responsive design is pixel-perfect
- ✅ Performance is excellent even on Slow 3G

---

## Implementation Notes

### Browser Configuration Script

Create a helper script to configure mobile emulation:

```bash
#!/bin/bash
# mobile-test-setup.sh

# Set device profile
DEVICE=${1:-iphone12}  # Default to iPhone 12
NETWORK=${2:-fast4g}   # Default to Fast 4G

case $DEVICE in
  iphonese)
    WIDTH=375
    HEIGHT=667
    SCALE=2
    ;;
  iphone12)
    WIDTH=390
    HEIGHT=844
    SCALE=3
    ;;
  ipadmini)
    WIDTH=768
    HEIGHT=1024
    SCALE=2
    ;;
esac

echo "Configuring mobile emulation:"
echo "Device: $DEVICE"
echo "Viewport: ${WIDTH}x${HEIGHT}"
echo "Scale: ${SCALE}x"
echo "Network: $NETWORK"

# Export for use in testing
export MOBILE_DEVICE=$DEVICE
export MOBILE_WIDTH=$WIDTH
export MOBILE_HEIGHT=$HEIGHT
export MOBILE_SCALE=$SCALE
export MOBILE_NETWORK=$NETWORK
```

### Testing Execution Command

```bash
# Run mobile testing for specific device
./mobile-test-setup.sh iphone12 fast4g
npm run test:mobile:e2e

# Run full mobile test suite (all devices)
npm run test:mobile:full
```

---

## Recommendations

### Before Starting Mobile Testing

1. **Fix Desktop P0 Bugs First** - BUG-008, BUG-012, BUG-013 should be fixed before mobile testing
2. **Verify Responsive Design** - Do a quick manual check that the site is mobile-responsive
3. **Check Mobile Analytics** - Review any existing mobile usage data to prioritize testing
4. **Set Up Test Data** - Ensure test data is comprehensive and realistic

### During Mobile Testing

1. **Test in Order** - Follow the execution order (iPhone 12 first, then others)
2. **Document Everything** - Take screenshots of every issue found
3. **Compare to Desktop** - Note differences between mobile and desktop behavior
4. **Test Real Workflows** - Focus on actual user workflows, not just UI elements

### After Mobile Testing

1. **Prioritize Mobile Bugs** - Separate P0/P1/P2 mobile bugs
2. **Create Mobile Roadmap** - Add mobile bugs to Master Roadmap
3. **Validate on Real Devices** - Test critical workflows on real devices if possible
4. **Monitor Mobile Performance** - Set up mobile performance monitoring

---

## Conclusion

This mobile E2E testing strategy provides a comprehensive approach to achieving 100% test coverage on mobile devices while accounting for mobile-specific considerations. The strategy is designed to be executed autonomously using browser mobile emulation, with the same thoroughness as the desktop testing.

**Estimated Total Effort:** 19-26 hours for complete mobile testing across all device profiles and network conditions.

**Expected Outcome:** Comprehensive mobile test coverage with detailed bug reports, performance metrics, and mobile readiness assessment.

---

**End of Strategy Document**

*Ready for autonomous execution*  
*TERP Cannabis ERP System v1.0.0*
