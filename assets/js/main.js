// Main JavaScript for Liminal Gallery & Ember & Hearth
// Handles mobile navigation, smooth scrolling, and interactive elements

(function() {
  'use strict';

  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {

    // ===================================
    // Smooth Scroll for Anchor Links
    // ===================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }
      });
    });

    // ===================================
    // Active Navigation State
    // ===================================
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
      const linkPath = link.getAttribute('href');
      if (currentPath.includes(linkPath) && linkPath !== '/') {
        const parentLi = link.closest('li');
        if (parentLi) {
          parentLi.classList.add('active');
        }
      }
    });

    // ===================================
    // Mobile Menu Toggle (if exists)
    // ===================================
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('nav ul');

    if (mobileMenuToggle && nav) {
      mobileMenuToggle.addEventListener('click', function() {
        nav.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
      });

      // Close menu when clicking outside
      document.addEventListener('click', function(event) {
        if (!nav.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
          nav.classList.remove('active');
          mobileMenuToggle.classList.remove('active');
        }
      });
    }

    // ===================================
    // Lazy Loading Images
    // ===================================
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
      });
    }

    // ===================================
    // Fade In Animation on Scroll
    // ===================================
    const fadeElements = document.querySelectorAll('.fade-in-on-scroll');
    
    if (fadeElements.length > 0 && 'IntersectionObserver' in window) {
      const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      }, {
        threshold: 0.1
      });

      fadeElements.forEach(element => {
        fadeObserver.observe(element);
      });
    }

    // ===================================
    // Form Validation (if forms exist)
    // ===================================
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
          if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            
            // Remove error class on input
            field.addEventListener('input', function() {
              this.classList.remove('error');
            }, { once: true });
          }
        });

        if (!isValid) {
          e.preventDefault();
          alert('Please fill in all required fields.');
        }
      });
    });

    // ===================================
    // Back to Top Button (optional)
    // ===================================
    const backToTopButton = document.querySelector('.back-to-top');
    
    if (backToTopButton) {
      window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
          backToTopButton.classList.add('visible');
        } else {
          backToTopButton.classList.remove('visible');
        }
      });

      backToTopButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }

  });

})();
