# Data Card Feature: Testing Guide

**Author:** Manus AI  
**Date:** October 28, 2025

## 1. Overview

This document provides a comprehensive testing guide for the Data Card feature in the TERP ERP system. The goal of this guide is to ensure that the feature is working as expected and to identify any potential issues before they impact users.

## 2. Testing Checklist

### 2.1. Data Accuracy

- [ ] **Verify all metric calculations:** Manually verify that the metric values displayed in the data cards are accurate. This can be done by comparing the values to the data in the database.
- [ ] **Test with different data sets:** Test the data cards with a variety of data sets, including empty, small, and large data sets, to ensure that the calculations are correct in all scenarios.

### 2.2. Functionality

- [ ] **Test data card navigation:** Click on each data card to ensure that it navigates to the correct page with the correct filters applied.
- [ ] **Test the "Customize Metrics" modal:**
    - [ ] Open the modal and verify that it displays the correct list of available metrics.
    - [ ] Select and deselect metrics to ensure that the selection logic is working correctly.
    - [ ] Save the changes and verify that the data cards are updated with the new metrics.
    - [ ] Test the "Reset to Defaults" button to ensure that it restores the default metrics.
- [ ] **Test URL parameter filtering:**
    - [ ] Navigate to a module page with a filter parameter in the URL (e.g., `/inventory?stockLevel=low_stock`).
    - [ ] Verify that the page is filtered correctly based on the URL parameter.

### 2.3. User Interface

- [ ] **Check for visual glitches:** Verify that the data cards and the "Customize Metrics" modal are displayed correctly on different screen sizes and browsers.
- [ ] **Test for responsiveness:** Ensure that the data cards and the modal are responsive and easy to use on mobile devices.

### 2.4. Performance

- [ ] **Measure page load times:** Measure the page load times for each module to ensure that the data cards are not impacting performance.
- [ ] **Test with large data sets:** Test the data cards with large data sets to ensure that they are still performant.

## 3. Known Issues

- **"Customize Metrics" modal crash:** There is a known issue where clicking the "Customize Metrics" button causes the application to crash. This issue is currently being investigated.
