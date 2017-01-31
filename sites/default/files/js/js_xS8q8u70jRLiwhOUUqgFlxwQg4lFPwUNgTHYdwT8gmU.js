(function($) {
  Drupal.behaviors.aet_insert = {
    attach: function(context, settings) {
      Drupal.aet_insert.settings = settings.aet_insert;
      Drupal.aet_insert.fields = $('.aet_insert_field');
      $('.aet_insert_field select').change(function() {
        var $this = $(this);
        var $aet_insert_field = $($this.parents('.aet_insert_field'));
        Drupal.aet_insert.disable($aet_insert_field);
        $.ajax({
          url: Drupal.aet_insert.settings.ajax_path,
          data: {
            id: $aet_insert_field.attr('id'),
            target: $aet_insert_field.data('target'),
            entity_type: $aet_insert_field.data('entity-type'),
            entity_id: $aet_insert_field.data('entity-id'),
            data: Drupal.aet_insert.getData($aet_insert_field, $this),
          },
          context: $aet_insert_field,
          error: function() {
            Drupal.aet_insert.enable(this);
          },
          success: function(data, textStatus, XMLHttpRequest) {
            Drupal.aet_insert.enable(this);
            this.replaceWith(data);
            Drupal.behaviors.aet_insert.attach(Drupal.aet_insert.context,
              {aet_insert: Drupal.aet_insert.settings});
          },
        });
      });

      $('.aet_insert_field .aet-insert-button').click(function(event) {
        event.preventDefault();
        var $this = $(this);
        var $aet_insert_field = $($this.parent());
        var data = Drupal.aet_insert.getData($aet_insert_field, $this);
        var token = '[';
        if (data[0] === 'active_user') {
          token += 'user';
        }
        else if (data[0].indexOf('this_') === 0) {
          token += data[0].slice('this_'.length);
        }
        else {
          token += 'aet:' + data[0].slice('aet_'.length);
        }
        data.shift();

        for (i in data) {
          if (data[i].length > 0) {
            token += ':' + data[i];
          }
        }
        token += ']';
        Drupal.aet_insert.insertAtCaret($aet_insert_field.data('target'), token);
      });
    }
  };

  Drupal.aet_insert = {
    settings: {},
    fields: null,
  };

  Drupal.aet_insert.insertAtCaret = function(areaId,text) {
    var txtarea = document.getElementById(areaId);
    var scrollPos = txtarea.scrollTop;
    var strPos = 0;
    var br = ((txtarea.selectionStart || txtarea.selectionStart == '0') ?
        "ff" : (document.selection ? "ie" : false ) );
    if (br == "ie") {
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart ('character', -txtarea.value.length);
        strPos = range.text.length;
    }
    else if (br == "ff") strPos = txtarea.selectionStart;

    var front = (txtarea.value).substring(0,strPos);
    var back = (txtarea.value).substring(strPos,txtarea.value.length);
    txtarea.value=front+text+back;
    strPos = strPos + text.length;
    if (br == "ie") {
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart ('character', -txtarea.value.length);
        range.moveStart ('character', strPos);
        range.moveEnd ('character', 0);
        range.select();
    }
    else if (br == "ff") {
        txtarea.selectionStart = strPos;
        txtarea.selectionEnd = strPos;
        txtarea.focus();
    }
    txtarea.scrollTop = scrollPos;
  };

  Drupal.aet_insert.getData = function($target, $selector) {
    var data = [];
    var children = $target.children('.form-item');
    for (var i=0; i< children.length; i++) {
      $child = $(children[i]);
      $child_selector = $child.find('select');
      data[i] = $child_selector.find(':selected').attr('value');
      if ($child_selector[0] === $selector[0]) {
        break;
      }
    }

    return data;
  };

  Drupal.aet_insert.disable = function($target) {
    $target.find('select').attr('disabled', 'disabled');
  };

  Drupal.aet_insert.enable = function($target) {
    $target.find('select').removeAttr('disabled');
  };
})(jQuery);;
(function ($) {
  Drupal.behaviors.geofieldMapInit = {
    attach: function (context, settings) {

      // Init all maps in Drupal.settings.
      if (settings.geofield_gmap) {
        $.each(settings.geofield_gmap, function(mapid, options) {
          geofield_gmap_initialize({
            lat: options.lat,
            lng: options.lng,
            zoom: options.zoom,
            latid: options.latid,
            lngid: options.lngid,
            searchid: options.searchid,
            mapid: options.mapid,
            widget: options.widget,
            map_type: options.map_type,
            confirm_center_marker: options.confirm_center_marker,
            click_to_place_marker: options.click_to_place_marker,
          });
        });
      }

    }
  };
})(jQuery);

var geofield_gmap_geocoder;
var geofield_gmap_data = [];

// Center the map to the marker location.
function geofield_gmap_center(mapid) {
  google.maps.event.trigger(geofield_gmap_data[mapid].map, 'resize');
  geofield_gmap_data[mapid].map.setCenter(geofield_gmap_data[mapid].marker.getPosition());
}

// Place marker at the current center of the map.
function geofield_gmap_marker(mapid) {
  if (geofield_gmap_data[mapid].confirm_center_marker) {
    if (!window.confirm('Change marker position ?')) return;
  }

  google.maps.event.trigger(geofield_gmap_data[mapid].map, 'resize');
  var position = geofield_gmap_data[mapid].map.getCenter();
  geofield_gmap_data[mapid].marker.setPosition(position);
  geofield_gmap_data[mapid].lat.val(position.lat());
  geofield_gmap_data[mapid].lng.val(position.lng());

  if (geofield_gmap_data[mapid].search) {
    geofield_gmap_geocoder.geocode({'latLng': position}, function (results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[0]) {
          geofield_gmap_data[mapid].search.val(results[0].formatted_address);
        }
      }
    });
  }
}

// Init google map.
function geofield_gmap_initialize(params) {
  geofield_gmap_data[params.mapid] = params;
  jQuery.noConflict();

  if (!geofield_gmap_geocoder) {
    geofield_gmap_geocoder = new google.maps.Geocoder();
  }

  var location = new google.maps.LatLng(params.lat, params.lng);
  var options = {
    zoom: Number(params.zoom),
    center: location,
    mapTypeId: google.maps.MapTypeId.SATELLITE,
    scaleControl: true,
    zoomControlOptions: {
      style: google.maps.ZoomControlStyle.LARGE
    }
  };

  switch (params.map_type) {
    case "ROADMAP":
      options.mapTypeId = google.maps.MapTypeId.ROADMAP;
      break;
    case "SATELLITE":
      options.mapTypeId = google.maps.MapTypeId.SATELLITE;
      break;
    case "HYBRID":
      options.mapTypeId = google.maps.MapTypeId.HYBRID;
      break;
    case "TERRAIN":
      options.mapTypeId = google.maps.MapTypeId.TERRAIN;
      break;
    default:
      options.mapTypeId = google.maps.MapTypeId.ROADMAP;
  }

  var map = new google.maps.Map(document.getElementById(params.mapid), options);
  geofield_gmap_data[params.mapid].map = map;

  // Fix http://code.google.com/p/gmaps-api-issues/issues/detail?id=1448.
  google.maps.event.addListener(map, "idle", function () {
    google.maps.event.trigger(map, 'resize');
  });

  // Fix map issue in fieldgroups / vertical tabs
  // https://www.drupal.org/node/2474867.
  google.maps.event.addListenerOnce(map, "idle", function () {
    // Show all map tiles when a map is shown in a vertical tab.
    jQuery('#' + params.mapid).closest('div.vertical-tabs').find('.vertical-tab-button a').click(function () {
      google.maps.event.trigger(map, 'resize');
      geofield_gmap_center(params.mapid);
    });
    // Show all map tiles when a map is shown in a collapsible fieldset.
    jQuery('#' + params.mapid).closest('fieldset.collapsible').find('a.fieldset-title').click(function () {
      google.maps.event.trigger(map, 'resize');
      geofield_gmap_center(params.mapid);
    });
  });

  // Place map marker.
  var marker = new google.maps.Marker({
    map: map,
    draggable: params.widget
  });
  geofield_gmap_data[params.mapid].marker = marker;
  marker.setPosition(location);

  if (params.widget && params.latid && params.lngid) {
    geofield_gmap_data[params.mapid].lat = jQuery("#" + params.latid);
    geofield_gmap_data[params.mapid].lng = jQuery("#" + params.lngid);
    if (params.searchid) {
      geofield_gmap_data[params.mapid].search = jQuery("#" + params.searchid);
      geofield_gmap_data[params.mapid].search.autocomplete({
        // This bit uses the geocoder to fetch address values.
        source: function (request, response) {
          geofield_gmap_geocoder.geocode({'address': request.term }, function (results, status) {
            response(jQuery.map(results, function (item) {
              return {
                label: item.formatted_address,
                value: item.formatted_address,
                latitude: item.geometry.location.lat(),
                longitude: item.geometry.location.lng()
              };
            }));
          });
        },
        // This bit is executed upon selection of an address.
        select: function (event, ui) {
          geofield_gmap_data[params.mapid].lat.val(ui.item.latitude);
          geofield_gmap_data[params.mapid].lng.val(ui.item.longitude);
          var location = new google.maps.LatLng(ui.item.latitude, ui.item.longitude);
          marker.setPosition(location);
          map.setCenter(location);
        }
      });

      // Geocode user input on enter.
      geofield_gmap_data[params.mapid].search.keydown(function (e) {
        if (e.which == 13) {
          var input = geofield_gmap_data[params.mapid].search.val();
          // Execute the geocoder
          geofield_gmap_geocoder.geocode({'address': input }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
              if (results[0]) {
                // Set the location
                var location = new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng());
                marker.setPosition(location);
                map.setCenter(location);
                // Fill the lat/lon fields with the new info
                geofield_gmap_data[params.mapid].lat.val(marker.getPosition().lat());
                geofield_gmap_data[params.mapid].lng.val(marker.getPosition().lng());
              }
            }
          });
        }
      });

      // Add listener to marker for reverse geocoding.
      google.maps.event.addListener(marker, 'drag', function () {
        geofield_gmap_geocoder.geocode({'latLng': marker.getPosition()}, function (results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            if (results[0]) {
              geofield_gmap_data[params.mapid].search.val(results[0].formatted_address);
              geofield_gmap_data[params.mapid].lat.val(marker.getPosition().lat());
              geofield_gmap_data[params.mapid].lng.val(marker.getPosition().lng());
            }
          }
        });
      });
    }

    if (params.click_to_place_marker) {
      // Change marker position with mouse click.
      google.maps.event.addListener(map, 'click', function (event) {
        var position = new google.maps.LatLng(event.latLng.lat(), event.latLng.lng());
        marker.setPosition(position);
        geofield_gmap_data[params.mapid].lat.val(position.lat());
        geofield_gmap_data[params.mapid].lng.val(position.lng());
        //google.maps.event.trigger(geofield_gmap_data[params.mapid].map, 'resize');
      });
    }

    geofield_onchange = function () {
      var location = new google.maps.LatLng(
        parseInt(geofield_gmap_data[params.mapid].lat.val()),
        parseInt(geofield_gmap_data[params.mapid].lng.val()));
      marker.setPosition(location);
      map.setCenter(location);
    };

    geofield_gmap_data[params.mapid].lat.change(geofield_onchange);
    geofield_gmap_data[params.mapid].lng.change(geofield_onchange);
  }
}
;
(function($) {

Drupal.admin = Drupal.admin || {};
Drupal.admin.behaviors = Drupal.admin.behaviors || {};
Drupal.admin.hashes = Drupal.admin.hashes || {};

/**
 * Core behavior for Administration menu.
 *
 * Test whether there is an administration menu is in the output and execute all
 * registered behaviors.
 */
Drupal.behaviors.adminMenu = {
  attach: function (context, settings) {
    // Initialize settings.
    settings.admin_menu = $.extend({
      suppress: false,
      margin_top: false,
      position_fixed: false,
      tweak_modules: false,
      tweak_permissions: false,
      tweak_tabs: false,
      destination: '',
      basePath: settings.basePath,
      hash: 0,
      replacements: {}
    }, settings.admin_menu || {});
    // Check whether administration menu should be suppressed.
    if (settings.admin_menu.suppress) {
      return;
    }
    var $adminMenu = $('#admin-menu:not(.admin-menu-processed)', context);
    // Client-side caching; if administration menu is not in the output, it is
    // fetched from the server and cached in the browser.
    if (!$adminMenu.length && settings.admin_menu.hash) {
      Drupal.admin.getCache(settings.admin_menu.hash, function (response) {
          if (typeof response == 'string' && response.length > 0) {
            $('body', context).append(response);
          }
          var $adminMenu = $('#admin-menu:not(.admin-menu-processed)', context);
          // Apply our behaviors.
          Drupal.admin.attachBehaviors(context, settings, $adminMenu);
          // Allow resize event handlers to recalculate sizes/positions.
          $(window).triggerHandler('resize');
      });
    }
    // If the menu is in the output already, this means there is a new version.
    else {
      // Apply our behaviors.
      Drupal.admin.attachBehaviors(context, settings, $adminMenu);
    }
  }
};

/**
 * Collapse fieldsets on Modules page.
 */
Drupal.behaviors.adminMenuCollapseModules = {
  attach: function (context, settings) {
    if (settings.admin_menu.tweak_modules) {
      $('#system-modules fieldset:not(.collapsed)', context).addClass('collapsed');
    }
  }
};

/**
 * Collapse modules on Permissions page.
 */
Drupal.behaviors.adminMenuCollapsePermissions = {
  attach: function (context, settings) {
    if (settings.admin_menu.tweak_permissions) {
      // Freeze width of first column to prevent jumping.
      $('#permissions th:first', context).css({ width: $('#permissions th:first', context).width() });
      // Attach click handler.
      $modules = $('#permissions tr:has(td.module)', context).once('admin-menu-tweak-permissions', function () {
        var $module = $(this);
        $module.bind('click.admin-menu', function () {
          // @todo Replace with .nextUntil() in jQuery 1.4.
          $module.nextAll().each(function () {
            var $row = $(this);
            if ($row.is(':has(td.module)')) {
              return false;
            }
            $row.toggleClass('element-hidden');
          });
        });
      });
      // Collapse all but the targeted permission rows set.
      if (window.location.hash.length) {
        $modules = $modules.not(':has(' + window.location.hash + ')');
      }
      $modules.trigger('click.admin-menu');
    }
  }
};

/**
 * Apply margin to page.
 *
 * Note that directly applying marginTop does not work in IE. To prevent
 * flickering/jumping page content with client-side caching, this is a regular
 * Drupal behavior.
 */
Drupal.behaviors.adminMenuMarginTop = {
  attach: function (context, settings) {
    if (!settings.admin_menu.suppress && settings.admin_menu.margin_top) {
      $('body:not(.admin-menu)', context).addClass('admin-menu');
    }
  }
};

/**
 * Retrieve content from client-side cache.
 *
 * @param hash
 *   The md5 hash of the content to retrieve.
 * @param onSuccess
 *   A callback function invoked when the cache request was successful.
 */
Drupal.admin.getCache = function (hash, onSuccess) {
  if (Drupal.admin.hashes.hash !== undefined) {
    return Drupal.admin.hashes.hash;
  }
  $.ajax({
    cache: true,
    type: 'GET',
    dataType: 'text', // Prevent auto-evaluation of response.
    global: false, // Do not trigger global AJAX events.
    url: Drupal.settings.admin_menu.basePath.replace(/admin_menu/, 'js/admin_menu/cache/' + hash),
    success: onSuccess,
    complete: function (XMLHttpRequest, status) {
      Drupal.admin.hashes.hash = status;
    }
  });
};

/**
 * TableHeader callback to determine top viewport offset.
 *
 * @see toolbar.js
 */
Drupal.admin.height = function() {
  var $adminMenu = $('#admin-menu');
  var height = $adminMenu.outerHeight();
  // In IE, Shadow filter adds some extra height, so we need to remove it from
  // the returned height.
  if ($adminMenu.css('filter') && $adminMenu.css('filter').match(/DXImageTransform\.Microsoft\.Shadow/)) {
    height -= $adminMenu.get(0).filters.item("DXImageTransform.Microsoft.Shadow").strength;
  }
  return height;
};

/**
 * @defgroup admin_behaviors Administration behaviors.
 * @{
 */

/**
 * Attach administrative behaviors.
 */
Drupal.admin.attachBehaviors = function (context, settings, $adminMenu) {
  if ($adminMenu.length) {
    $adminMenu.addClass('admin-menu-processed');
    $.each(Drupal.admin.behaviors, function() {
      this(context, settings, $adminMenu);
    });
  }
};

/**
 * Apply 'position: fixed'.
 */
Drupal.admin.behaviors.positionFixed = function (context, settings, $adminMenu) {
  if (settings.admin_menu.position_fixed) {
    $adminMenu.addClass('admin-menu-position-fixed');
    $adminMenu.css('position', 'fixed');
  }
};

/**
 * Move page tabs into administration menu.
 */
Drupal.admin.behaviors.pageTabs = function (context, settings, $adminMenu) {
  if (settings.admin_menu.tweak_tabs) {
    var $tabs = $(context).find('ul.tabs.primary');
    $adminMenu.find('#admin-menu-wrapper > ul').eq(1)
      .append($tabs.find('li').addClass('admin-menu-tab'));
    $(context).find('ul.tabs.secondary')
      .appendTo('#admin-menu-wrapper > ul > li.admin-menu-tab.active')
      .removeClass('secondary');
    $tabs.remove();
  }
};

/**
 * Perform dynamic replacements in cached menu.
 */
Drupal.admin.behaviors.replacements = function (context, settings, $adminMenu) {
  for (var item in settings.admin_menu.replacements) {
    $(item, $adminMenu).html(settings.admin_menu.replacements[item]);
  }
};

/**
 * Inject destination query strings for current page.
 */
Drupal.admin.behaviors.destination = function (context, settings, $adminMenu) {
  if (settings.admin_menu.destination) {
    $('a.admin-menu-destination', $adminMenu).each(function() {
      this.search += (!this.search.length ? '?' : '&') + Drupal.settings.admin_menu.destination;
    });
  }
};

/**
 * Apply JavaScript-based hovering behaviors.
 *
 * @todo This has to run last.  If another script registers additional behaviors
 *   it will not run last.
 */
Drupal.admin.behaviors.hover = function (context, settings, $adminMenu) {
  // Delayed mouseout.
  $('li.expandable', $adminMenu).hover(
    function () {
      // Stop the timer.
      clearTimeout(this.sfTimer);
      // Display child lists.
      $('> ul', this)
        .css({left: 'auto', display: 'block'})
        // Immediately hide nephew lists.
        .parent().siblings('li').children('ul').css({left: '-999em', display: 'none'});
    },
    function () {
      // Start the timer.
      var uls = $('> ul', this);
      this.sfTimer = setTimeout(function () {
        uls.css({left: '-999em', display: 'none'});
      }, 400);
    }
  );
};

/**
 * Apply the search bar functionality.
 */
Drupal.admin.behaviors.search = function (context, settings, $adminMenu) {
  // @todo Add a HTML ID.
  var $input = $('input.admin-menu-search', $adminMenu);
  // Initialize the current search needle.
  var needle = $input.val();
  // Cache of all links that can be matched in the menu.
  var links;
  // Minimum search needle length.
  var needleMinLength = 2;
  // Append the results container.
  var $results = $('<div />').insertAfter($input);

  /**
   * Executes the search upon user input.
   */
  function keyupHandler() {
    var matches, $html, value = $(this).val();
    // Only proceed if the search needle has changed.
    if (value !== needle) {
      needle = value;
      // Initialize the cache of menu links upon first search.
      if (!links && needle.length >= needleMinLength) {
        // @todo Limit to links in dropdown menus; i.e., skip menu additions.
        links = buildSearchIndex($adminMenu.find('li:not(.admin-menu-action, .admin-menu-action li) > a'));
      }
      // Empty results container when deleting search text.
      if (needle.length < needleMinLength) {
        $results.empty();
      }
      // Only search if the needle is long enough.
      if (needle.length >= needleMinLength && links) {
        matches = findMatches(needle, links);
        // Build the list in a detached DOM node.
        $html = buildResultsList(matches);
        // Display results.
        $results.empty().append($html);
      }
    }
  }

  /**
   * Builds the search index.
   */
  function buildSearchIndex($links) {
    return $links
      .map(function () {
        var text = (this.textContent || this.innerText);
        // Skip menu entries that do not contain any text (e.g., the icon).
        if (typeof text === 'undefined') {
          return;
        }
        return {
          text: text,
          textMatch: text.toLowerCase(),
          element: this
        };
      });
  }

  /**
   * Searches the index for a given needle and returns matching entries.
   */
  function findMatches(needle, links) {
    var needleMatch = needle.toLowerCase();
    // Select matching links from the cache.
    return $.grep(links, function (link) {
      return link.textMatch.indexOf(needleMatch) !== -1;
    });
  }

  /**
   * Builds the search result list in a detached DOM node.
   */
  function buildResultsList(matches) {
    var $html = $('<ul class="dropdown admin-menu-search-results" />');
    $.each(matches, function () {
      var result = this.text;
      var $element = $(this.element);

      // Check whether there is a top-level category that can be prepended.
      var $category = $element.closest('#admin-menu-wrapper > ul > li');
      var categoryText = $category.find('> a').text()
      if ($category.length && categoryText) {
        result = categoryText + ': ' + result;
      }

      var $result = $('<li><a href="' + $element.attr('href') + '">' + result + '</a></li>');
      $result.data('original-link', $(this.element).parent());
      $html.append($result);
    });
    return $html;
  }

  /**
   * Highlights selected result.
   */
  function resultsHandler(e) {
    var $this = $(this);
    var show = e.type === 'mouseenter' || e.type === 'focusin';
    $this.trigger(show ? 'showPath' : 'hidePath', [this]);
  }

  /**
   * Closes the search results and clears the search input.
   */
  function resultsClickHandler(e, link) {
    var $original = $(this).data('original-link');
    $original.trigger('mouseleave');
    $input.val('').trigger('keyup');
  }

  /**
   * Shows the link in the menu that corresponds to a search result.
   */
  function highlightPathHandler(e, link) {
    if (link) {
      var $original = $(link).data('original-link');
      var show = e.type === 'showPath';
      // Toggle an additional CSS class to visually highlight the matching link.
      // @todo Consider using same visual appearance as regular hover.
      $original.toggleClass('highlight', show);
      $original.trigger(show ? 'mouseenter' : 'mouseleave');
    }
  }

  // Attach showPath/hidePath handler to search result entries.
  $results.delegate('li', 'mouseenter mouseleave focus blur', resultsHandler);
  // Hide the result list after a link has been clicked, useful for overlay.
  $results.delegate('li', 'click', resultsClickHandler);
  // Attach hover/active highlight behavior to search result entries.
  $adminMenu.delegate('.admin-menu-search-results li', 'showPath hidePath', highlightPathHandler);
  // Attach the search input event handler.
  $input.bind('keyup search', keyupHandler);
};

/**
 * @} End of "defgroup admin_behaviors".
 */

})(jQuery);
;
