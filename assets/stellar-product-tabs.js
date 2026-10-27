/**
 * Stellar Product Tabs
 * Groups adjacent featured-product sections that share a data-product-tab-group
 * value into a tabbed interface. Each section stays fully rendered in the DOM;
 * the JS only controls visibility via a class toggle.
 *
 * Expected markup on each section wrapper:
 *   <div ... data-product-tab-group="milky" data-product-tab-label="Original">
 *
 * Sections with no data-product-tab-group or a blank value are ignored.
 * If only one section exists in a group, no tabs are rendered.
 */
(function () {
  function init() {
    var sections = document.querySelectorAll('[data-product-tab-group]');
    if (!sections.length) return;

    /* Group sections by their tab group value */
    var groups = {};
    sections.forEach(function (el) {
      var group = el.getAttribute('data-product-tab-group');
      if (!group) return;
      /* Walk up to the .shopify-section wrapper */
      var wrapper = el.closest('.shopify-section') || el;
      if (!groups[group]) groups[group] = [];
      groups[group].push({
        wrapper: wrapper,
        el: el,
        label: el.getAttribute('data-product-tab-label') || 'Product ' + (groups[group].length + 1)
      });
    });

    Object.keys(groups).forEach(function (groupName) {
      var members = groups[groupName];
      if (members.length < 2) return;

      /* Create the tab bar */
      var tabBar = document.createElement('div');
      tabBar.className = 'spt-tab-bar';
      tabBar.setAttribute('role', 'tablist');

      members.forEach(function (member, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'spt-tab stellar-font-body';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
        btn.setAttribute('data-spt-index', idx);
        btn.textContent = member.label;
        tabBar.appendChild(btn);

        /* Initial visibility */
        if (idx > 0) {
          member.wrapper.classList.add('spt-hidden');
        }
        member.wrapper.classList.add('spt-member');
      });

      /* Insert tab bar before the first member's wrapper */
      var firstWrapper = members[0].wrapper;
      firstWrapper.parentNode.insertBefore(tabBar, firstWrapper);

      /* Inherit toggle-group visibility from the first member */
      var toggleGroup = members[0].el.getAttribute('data-toggle-group');
      if (toggleGroup) {
        tabBar.setAttribute('data-toggle-group', toggleGroup);
        /* If the resources toggle has already run and hidden this group, match its state */
        if (!members[0].el.classList.contains('srt-active')) {
          tabBar.style.display = 'none';
        }
      }

      /* Tab click handler */
      tabBar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-spt-index]');
        if (!btn) return;
        var activeIdx = parseInt(btn.getAttribute('data-spt-index'), 10);

        tabBar.querySelectorAll('.spt-tab').forEach(function (t) {
          t.setAttribute('aria-selected', 'false');
        });
        btn.setAttribute('aria-selected', 'true');

        members.forEach(function (member, idx) {
          if (idx === activeIdx) {
            member.wrapper.classList.remove('spt-hidden');
          } else {
            member.wrapper.classList.add('spt-hidden');
          }
        });
      });
    });

    /* Hook into the resources toggle so the tab bar shows/hides with its group */
    patchResourcesToggle();
  }

  /**
   * Patch: when the resources toggle activates a tab, also show/hide
   * the injected tab bars that share the same data-toggle-group.
   */
  function patchResourcesToggle() {
    var toggleSection = document.querySelector('[data-resources-toggle]');
    if (!toggleSection) return;

    var tabs = toggleSection.querySelectorAll('[data-srt-tab]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var tabValue = tab.getAttribute('data-srt-tab');
        document.querySelectorAll('.spt-tab-bar[data-toggle-group]').forEach(function (bar) {
          var group = bar.getAttribute('data-toggle-group');
          bar.style.display = (group === tabValue) ? '' : 'none';
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
