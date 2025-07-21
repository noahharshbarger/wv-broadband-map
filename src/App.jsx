import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';

// Import geographic and broadband data
import countiesUrl from './assets/wv_counties.geojson?url';
import tractsUrl from './assets/wv_tracts.geojson?url';
import broadbandDataUrl from './assets/wv_broadband_sample.json?url';
import ooklaSummaryUrl from './assets/wv_ookla_summary.json?url';
import ooklaPopulationUrl from './assets/wv_ookla_final_corrected.geojson?url';
import populationStatsUrl from './assets/wv_population_stats_final.json?url';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function App() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [showCounties, setShowCounties] = useState(true);
  const [showTracts, setShowTracts] = useState(false);
  const [showBroadband, setShowBroadband] = useState(false);
  const [showOokla, setShowOokla] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [broadbandData, setBroadbandData] = useState(null);
  const [ooklaData, setOoklaData] = useState(null);
  const [ooklaSummary, setOoklaSummary] = useState(null);
  const [populationStats, setPopulationStats] = useState(null);
  const [counties, setCounties] = useState([]);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [speedThreshold, setSpeedThreshold] = useState(25);
  const [stats, setStats] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  // Calculate statistics when broadband data changes
  useEffect(() => {
    if (broadbandData) {
      const totalTracts = broadbandData.length;
      const noService = broadbandData.filter(d => d.tier === 'No Service').length;
      const belowThreshold = broadbandData.filter(d => d.max_down_mbps < speedThreshold).length;
      const highSpeed = broadbandData.filter(d => d.max_down_mbps >= 100).length;
      const avgSpeed = broadbandData.reduce((sum, d) => sum + d.max_down_mbps, 0) / totalTracts;
      const totalPopulation = broadbandData.reduce((sum, d) => sum + d.population_estimate, 0);
      const underservedPop = broadbandData
        .filter(d => d.max_down_mbps < speedThreshold)
        .reduce((sum, d) => sum + d.population_estimate, 0);

      setStats({
        totalTracts,
        noService,
        belowThreshold,
        highSpeed,
        avgSpeed: Math.round(avgSpeed),
        totalPopulation,
        underservedPop,
        underservedPercent: Math.round((underservedPop / totalPopulation) * 100)
      });
    }
  }, [broadbandData, speedThreshold]);

  // Export Functions
  const exportToCSV = () => {
    if (!broadbandData) return;

    const headers = [
      'Tract ID',
      'County FIPS',
      'Tract Name', 
      'Max Download (Mbps)',
      'Max Upload (Mbps)',
      'Service Tier',
      'Provider Count',
      'Population Estimate',
      'Coverage Percent'
    ];

    const csvData = broadbandData.map(record => [
      record.geoid,
      record.county_fips,
      record.tract_name,
      record.max_down_mbps,
      record.max_up_mbps,
      record.tier,
      record.provider_count,
      record.population_estimate,
      record.percent_covered
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wv-broadband-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const captureMapScreenshot = async () => {
    const map = mapInstanceRef.current;
    if (!map) return null;

    try {
      // Hide the controls temporarily for clean screenshot
      const controls = document.querySelector('.layer-controls');
      const originalDisplay = controls.style.display;
      controls.style.display = 'none';

      // Wait for the UI to update and map to finish rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the map canvas
      const mapCanvas = map.getCanvas();
      
      // Check if the canvas has content
      if (!mapCanvas || mapCanvas.width === 0 || mapCanvas.height === 0) {
        throw new Error('Map canvas is not available or has no content');
      }

      // Create a new canvas for the screenshot
      const screenshotCanvas = document.createElement('canvas');
      screenshotCanvas.width = mapCanvas.width;
      screenshotCanvas.height = mapCanvas.height;
      
      const ctx = screenshotCanvas.getContext('2d');
      
      // Set preserveDrawingBuffer to true for the map (this is key for WebGL)
      try {
        ctx.drawImage(mapCanvas, 0, 0);
      } catch (drawError) {
        console.error('Error drawing to canvas:', drawError);
        throw new Error('Failed to capture map content - try refreshing the page');
      }

      // Restore controls
      controls.style.display = originalDisplay;

      return screenshotCanvas;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Screenshot failed: ' + error.message + '\n\nThis can happen with WebGL maps. Try refreshing the page or using a different browser.');
      
      // Restore controls on error
      const controls = document.querySelector('.layer-controls');
      if (controls) {
        controls.style.display = '';
      }
      return null;
    }
  };

  const generateExecutiveSummary = () => {
    if (!stats) return '';

    const date = new Date().toLocaleDateString();
    const focus = selectedCounty ? `${selectedCounty} County` : 'West Virginia';

    return `
WEST VIRGINIA BROADBAND ANALYSIS REPORT
Generated: ${date}
Focus Area: ${focus}
Speed Threshold: ${speedThreshold} Mbps

EXECUTIVE SUMMARY:
This analysis reveals critical broadband infrastructure gaps across West Virginia. 
${stats.underservedPercent}% of the population (${stats.underservedPop.toLocaleString()} residents) 
lack access to broadband speeds of ${speedThreshold} Mbps or higher, which is considered 
the minimum for modern digital needs.

KEY FINDINGS:
• ${stats.totalTracts} census tracts analyzed
• ${stats.noService} tracts have no broadband service
• Average broadband speed: ${stats.avgSpeed} Mbps
• ${Math.round((stats.highSpeed / stats.totalTracts) * 100)}% of tracts have high-speed access (100+ Mbps)
• ${stats.belowThreshold} tracts fall below the ${speedThreshold} Mbps threshold

POLICY IMPLICATIONS:
The data indicates significant infrastructure investment is needed to achieve universal 
broadband access. Priority areas for BEAD funding and infrastructure development 
should focus on the ${stats.belowThreshold} underserved census tracts, particularly 
those with no current service.

RECOMMENDATIONS:
1. Target BEAD funding to areas below ${speedThreshold} Mbps
2. Prioritize fiber infrastructure in unserved areas
3. Encourage public-private partnerships for rural connectivity
4. Monitor progress with quarterly speed assessments

This analysis provides the foundation for evidence-based broadband policy decisions 
and infrastructure investment strategies.
    `.trim();
  };

  const generatePDFReport = async () => {
    setIsExporting(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Title Page
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('West Virginia Broadband Analysis', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 45, { align: 'center' });
      
      if (selectedCounty) {
        pdf.text(`Focus: ${selectedCounty} County`, pageWidth / 2, 55, { align: 'center' });
      }

      // Statistics Box
      if (stats) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Statistics', 20, 80);
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        const statsText = [
          `Total Census Tracts: ${stats.totalTracts}`,
          `Speed Threshold: ${speedThreshold} Mbps`,
          `Population Below Threshold: ${stats.underservedPercent}% (${stats.underservedPop.toLocaleString()})`,
          `Average Speed: ${stats.avgSpeed} Mbps`,
          `Tracts with No Service: ${stats.noService}`,
          `Tracts with 100+ Mbps: ${Math.round((stats.highSpeed / stats.totalTracts) * 100)}%`
        ];
        
        statsText.forEach((text, index) => {
          pdf.text(text, 25, 95 + (index * 8));
        });
      }

      // Try to capture and add map screenshot
      const mapCanvas = await captureMapScreenshot();
      if (mapCanvas) {
        const imgData = mapCanvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = pageWidth - 40;
        const imgHeight = (mapCanvas.height * imgWidth) / mapCanvas.width;
        
        // Add new page for map if needed
        if (imgHeight > pageHeight - 100) {
          pdf.addPage();
          pdf.text('Current Map View', pageWidth / 2, 20, { align: 'center' });
          pdf.addImage(imgData, 'JPEG', 20, 30, imgWidth, Math.min(imgHeight, pageHeight - 60));
        } else {
          pdf.text('Current Map View', 20, 160);
          pdf.addImage(imgData, 'JPEG', 20, 170, imgWidth, imgHeight);
        }
      }

      // Executive Summary
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', 20, 20);
      
      const summary = generateExecutiveSummary();
      const summaryLines = pdf.splitTextToSize(summary, pageWidth - 40);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(summaryLines, 20, 35);

      // Save the PDF
      const filename = `WV-Broadband-Report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadScreenshot = async () => {
    const canvas = await captureMapScreenshot();
    if (canvas) {
      const link = document.createElement('a');
      link.download = `wv-broadband-map-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  useEffect(() => {
    if (!mapboxgl.accessToken) {
      console.error('❌ Mapbox access token is missing!');
      // Show error message in the UI
      const mapContainer = mapRef.current;
      if (mapContainer) {
        mapContainer.innerHTML = `
          <div style="padding: 20px; text-align: center; background: #f8f9fa; border: 2px solid #dc3545; border-radius: 8px; margin: 20px;">
            <h3 style="color: #dc3545;">⚠️ Mapbox Token Required</h3>
            <p>This demo requires a Mapbox access token for GitHub Pages deployment.</p>
            <p><strong>For local development:</strong> Add VITE_MAPBOX_TOKEN to your .env file</p>
            <p><strong>For GitHub Pages:</strong> Token must be embedded in code (not secure for production)</p>
            <p><a href="https://account.mapbox.com/access-tokens/" target="_blank">Get a free Mapbox token here</a></p>
          </div>
        `;
      }
      return;
    }

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-80.5, 38.5], // WV centroid
      zoom: 6,
      preserveDrawingBuffer: true // Enable screenshot capture
    });

    mapInstanceRef.current = map;

    // ─────────────────────────────────────────────────────────
    // Load all data after the basemap is ready
    // ─────────────────────────────────────────────────────────
    map.on('load', async () => {
      try {
        // Load counties
        const countiesResp = await fetch(countiesUrl);
        if (!countiesResp.ok) {
          throw new Error(`HTTP ${countiesResp.status}: ${countiesResp.statusText}`);
        }
        const countiesData = await countiesResp.json();

        // Extract county list for dropdown
        const countyList = countiesData.features.map(feature => ({
          name: feature.properties.NAME,
          fips: feature.properties.COUNTY,
          geoid: feature.properties.GEOID
        })).sort((a, b) => a.name.localeCompare(b.name));
        setCounties(countyList);

        // Load tracts
        const tractsResp = await fetch(tractsUrl);
        if (!tractsResp.ok) {
          throw new Error(`HTTP ${tractsResp.status}: ${tractsResp.statusText}`);
        }
        const tractsData = await tractsResp.json();

        // Load broadband data
        const broadbandResp = await fetch(broadbandDataUrl);
        if (!broadbandResp.ok) {
          throw new Error(`HTTP ${broadbandResp.status}: ${broadbandResp.statusText}`);
        }
        const broadbandInfo = await broadbandResp.json();
        setBroadbandData(broadbandInfo);

        // Load Ookla speed test data (population-corrected)
        const ooklaResp = await fetch(ooklaPopulationUrl);
        if (!ooklaResp.ok) {
          throw new Error(`HTTP ${ooklaResp.status}: ${ooklaResp.statusText}`);
        }
        const ooklaInfo = await ooklaResp.json();
        setOoklaData(ooklaInfo);

        // Load Ookla summary statistics
        const ooklaSummResp = await fetch(ooklaSummaryUrl);
        if (!ooklaSummResp.ok) {
          throw new Error(`HTTP ${ooklaSummResp.status}: ${ooklaSummResp.statusText}`);
        }
        const ooklaSummaryInfo = await ooklaSummResp.json();
        setOoklaSummary(ooklaSummaryInfo);

        // Load population-weighted statistics
        const popStatsResp = await fetch(populationStatsUrl);
        if (!popStatsResp.ok) {
          throw new Error(`HTTP ${popStatsResp.status}: ${popStatsResp.statusText}`);
        }
        const popStatsInfo = await popStatsResp.json();
        setPopulationStats(popStatsInfo);

        console.log(`✅ Loaded ${countiesData.features.length} counties, ${tractsData.features.length} census tracts, ${broadbandInfo.length} broadband records, and ${ooklaInfo.features.length} Ookla speed test tiles`);

        // Create broadband lookup for quick access
        const broadbandLookup = {};
        broadbandInfo.forEach(record => {
          broadbandLookup[record.geoid] = record;
        });

        // Enhance tracts with broadband data
        tractsData.features.forEach(feature => {
          const geoid = feature.properties.GEOID;
          const broadband = broadbandLookup[geoid];
          if (broadband) {
            feature.properties.broadband_tier = broadband.tier;
            feature.properties.broadband_down = broadband.max_down_mbps;
            feature.properties.broadband_up = broadband.max_up_mbps;
            feature.properties.broadband_providers = broadband.provider_count;
            feature.properties.broadband_coverage = broadband.percent_covered;
            feature.properties.broadband_color = broadband.color;
          }
        });

        // Add data sources
        map.addSource('counties', { type: 'geojson', data: countiesData });
        map.addSource('tracts', { type: 'geojson', data: tractsData });
        map.addSource('ookla', { type: 'geojson', data: ooklaInfo });

        // Counties layers
        map.addLayer({
          id: 'counties-fill',
          type: 'fill',
          source: 'counties',
          paint: {
            'fill-color': '#088',
            'fill-opacity': 0.6
          }
        });

        map.addLayer({
          id: 'counties-outline',
          type: 'line',
          source: 'counties',
          paint: {
            'line-color': '#333',
            'line-width': 2
          }
        });

        // Basic census tracts layers (initially hidden)
        map.addLayer({
          id: 'tracts-fill',
          type: 'fill',
          source: 'tracts',
          paint: {
            'fill-color': '#e74c3c',
            'fill-opacity': 0.4
          },
          layout: {
            'visibility': 'none'
          }
        });

        map.addLayer({
          id: 'tracts-outline',
          type: 'line',
          source: 'tracts',
          paint: {
            'line-color': '#c0392b',
            'line-width': 0.5
          },
          layout: {
            'visibility': 'none'
          }
        });

        // Broadband choropleth layers (initially hidden)
        map.addLayer({
          id: 'broadband-fill',
          type: 'fill',
          source: 'tracts',
          paint: {
            'fill-color': [
              'case',
              ['!=', ['get', 'broadband_color'], null],
              ['get', 'broadband_color'],
              '#cccccc' // Default gray for missing data
            ],
            'fill-opacity': 0.8
          },
          layout: {
            'visibility': 'none'
          }
        });

        map.addLayer({
          id: 'broadband-outline',
          type: 'line',
          source: 'tracts',
          paint: {
            'line-color': '#ffffff',
            'line-width': 0.5,
            'line-opacity': 0.8
          },
          layout: {
            'visibility': 'none'
          }
        });

        // Ookla speed test layers (real data!)
        map.addLayer({
          id: 'ookla-fill',
          type: 'fill',
          source: 'ookla',
          paint: {
            'fill-color': [
              'case',
              ['!=', ['get', 'color'], null],
              ['get', 'color'],
              '#cccccc'
            ],
            'fill-opacity': 0.8
          },
          layout: {
            'visibility': 'none'
          }
        });

        map.addLayer({
          id: 'ookla-outline',
          type: 'line',
          source: 'ookla',
          paint: {
            'line-color': '#ffffff',
            'line-width': 0.3,
            'line-opacity': 0.6
          },
          layout: {
            'visibility': 'none'
          }
        });

        // Comparison/discrepancy layer (shows where FCC vs Ookla differ significantly)
        map.addLayer({
          id: 'comparison-layer',
          type: 'fill',
          source: 'ookla',
          paint: {
            'fill-color': '#e74c3c',
            'fill-opacity': 0.9
          },
          filter: ['<', ['get', 'download_mbps'], 100], // Simplified filter for now
          layout: {
            'visibility': 'none'
          }
        });

        // Speed threshold filter layer
        map.addLayer({
          id: 'speed-filter',
          type: 'fill',
          source: 'tracts',
          paint: {
            'fill-color': '#e74c3c',
            'fill-opacity': 0.9
          },
          filter: ['<', ['get', 'broadband_down'], speedThreshold],
          layout: {
            'visibility': 'none'
          }
        });

        // Add click handlers for popup info
        map.on('click', 'counties-fill', (e) => {
          if (e.features && e.features.length > 0) {
            const properties = e.features[0].properties;
            console.log('County clicked:', properties);
            
            try {
              const popup = new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div>
                    <h3>${properties.NAME} County</h3>
                    <p><strong>State:</strong> ${properties.STATE_NAME || 'West Virginia'}</p>
                    <p><strong>County Code:</strong> ${properties.COUNTY}</p>
                    <p><strong>GEOID:</strong> ${properties.GEOID || properties.GEO_ID}</p>
                  </div>
                `)
                .addTo(map);
              
              console.log('County popup created:', popup);
            } catch (error) {
              console.error('Error creating county popup:', error);
            }
          }
        });

        map.on('click', 'tracts-fill', (e) => {
          if (e.features && e.features.length > 0) {
            const properties = e.features[0].properties;
            console.log('Tract clicked:', properties);
            
            try {
              const landAreaKm2 = properties.ALAND ? (properties.ALAND / 1000000).toFixed(2) : 'N/A';
              
              const popup = new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div>
                    <h3>Census Tract ${properties.NAME}</h3>
                    <p><strong>County:</strong> ${properties.NAMELSADCO}</p>
                    <p><strong>Tract ID:</strong> ${properties.GEOID}</p>
                    <p><strong>Land Area:</strong> ${landAreaKm2} km²</p>
                  </div>
                `)
                .addTo(map);
              
              console.log('Tract popup created:', popup);
            } catch (error) {
              console.error('Error creating tract popup:', error);
            }
          }
        });

        map.on('click', 'broadband-fill', (e) => {
          if (e.features && e.features.length > 0) {
            const properties = e.features[0].properties;
            console.log('Broadband tract clicked:', properties);
            
            try {
              const popup = new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div>
                    <h3>Census Tract ${properties.NAME}</h3>
                    <p><strong>County:</strong> ${properties.NAMELSADCO}</p>
                    <p><strong>Broadband Tier:</strong> ${properties.broadband_tier}</p>
                    <p><strong>Max Speed:</strong> ${properties.broadband_down}↓/${properties.broadband_up}↑ Mbps</p>
                    <p><strong>Providers:</strong> ${properties.broadband_providers}</p>
                    <p><strong>Coverage:</strong> ${properties.broadband_coverage}%</p>
                  </div>
                `)
                .addTo(map);
              
              console.log('Broadband popup created:', popup);
            } catch (error) {
              console.error('Error creating broadband popup:', error);
            }
          }
        });

        map.on('click', 'ookla-fill', (e) => {
          if (e.features && e.features.length > 0) {
            const properties = e.features[0].properties;
            console.log('Ookla speed test clicked:', properties);
            
            try {
              const popup = new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div>
                    <h3>Ookla Speed Test</h3>
                    <p><strong>County:</strong> ${properties.NAMELSADCO}</p>
                    <p><strong>Download Speed:</strong> ${properties.download_mbps} Mbps</p>
                    <p><strong>Upload Speed:</strong> ${properties.upload_mbps} Mbps</p>
                    <p><strong>Ping:</strong> ${properties.ping_ms} ms</p>
                    <p><strong>Provider:</strong> ${properties.provider}</p>
                  </div>
                `)
                .addTo(map);
              
              console.log('Ookla popup created:', popup);
            } catch (error) {
              console.error('Error creating Ookla popup:', error);
            }
          }
        });

        map.on('click', 'comparison-layer', (e) => {
          if (e.features && e.features.length > 0) {
            const properties = e.features[0].properties;
            console.log('Comparison area clicked:', properties);
            
            try {
              const popup = new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div>
                    <h3>Discrepancy Area</h3>
                    <p><strong>County:</strong> ${properties.NAMELSADCO}</p>
                    <p><strong>Download Speed:</strong> ${properties.download_mbps} Mbps</p>
                    <p><strong>Upload Speed:</strong> ${properties.upload_mbps} Mbps</p>
                    <p><strong>Ping:</strong> ${properties.ping_ms} ms</p>
                    <p><strong>⚠️ Significant Difference</strong></p>
                  </div>
                `)
                .addTo(map);
              
              console.log('Comparison popup created:', popup);
            } catch (error) {
              console.error('Error creating comparison popup:', error);
            }
          }
        });

        map.on('click', 'speed-filter', (e) => {
          if (e.features && e.features.length > 0) {
            const properties = e.features[0].properties;
            
            try {
              const popup = new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div>
                    <h3>Underserved Area</h3>
                    <p><strong>Tract:</strong> ${properties.NAME}</p>
                    <p><strong>County:</strong> ${properties.NAMELSADCO}</p>
                    <p><strong>Max Speed:</strong> ${properties.broadband_down} Mbps</p>
                    <p><strong>⚠️ Below ${speedThreshold} Mbps threshold</strong></p>
                  </div>
                `)
                .addTo(map);
              
              console.log('Filter popup created:', popup);
            } catch (error) {
              console.error('Error creating filter popup:', error);
            }
          }
        });

        // Change cursor on hover
        ['counties-fill', 'tracts-fill', 'broadband-fill', 'ookla-fill', 'comparison-layer', 'speed-filter'].forEach(layerId => {
          map.on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = '';
          });
        });
        
      } catch (error) {
        console.error('❌ Error loading data:', error);
      }
    });

    map.on('error', (e) => {
      console.error('🗺️ Map error:', e);
    });

    return () => map.remove();
  }, []);

  // Handle layer visibility changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    try {
      const countiesVisibility = showCounties ? 'visible' : 'none';
      const tractsVisibility = showTracts ? 'visible' : 'none';
      const broadbandVisibility = showBroadband ? 'visible' : 'none';
      const ooklaVisibility = showOokla ? 'visible' : 'none';
      const comparisonVisibility = showComparison ? 'visible' : 'none';

      if (map.getLayer('counties-fill')) {
        map.setLayoutProperty('counties-fill', 'visibility', countiesVisibility);
        map.setLayoutProperty('counties-outline', 'visibility', countiesVisibility);
      }

      if (map.getLayer('tracts-fill')) {
        map.setLayoutProperty('tracts-fill', 'visibility', tractsVisibility);
        map.setLayoutProperty('tracts-outline', 'visibility', tractsVisibility);
      }

      if (map.getLayer('broadband-fill')) {
        map.setLayoutProperty('broadband-fill', 'visibility', broadbandVisibility);
        map.setLayoutProperty('broadband-outline', 'visibility', broadbandVisibility);
      }

      if (map.getLayer('ookla-fill')) {
        map.setLayoutProperty('ookla-fill', 'visibility', ooklaVisibility);
        map.setLayoutProperty('ookla-outline', 'visibility', ooklaVisibility);
      }

      if (map.getLayer('comparison-layer')) {
        map.setLayoutProperty('comparison-layer', 'visibility', comparisonVisibility);
      }
    } catch (error) {
      console.error('Error updating layer visibility:', error);
    }
  }, [showCounties, showTracts, showBroadband, showOokla, showComparison]);

  // Handle speed threshold filter updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer('speed-filter')) return;

    try {
      map.setFilter('speed-filter', ['<', ['get', 'broadband_down'], speedThreshold]);
    } catch (error) {
      console.error('Error updating speed filter:', error);
    }
  }, [speedThreshold]);

  const handleCountiesToggle = () => {
    setShowCounties(!showCounties);
  };

  const handleTractsToggle = () => {
    setShowTracts(!showTracts);
  };

  const handleBroadbandToggle = () => {
    setShowBroadband(!showBroadband);
  };

  const handleCountySearch = (e) => {
    const countyName = e.target.value;
    setSelectedCounty(countyName);
    
    if (countyName && mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      const countyData = map.getSource('counties');
      
      if (countyData && countyData._data) {
        // Find the specific county feature
        const countyFeature = countyData._data.features.find(
          feature => feature.properties.NAME === countyName
        );
        
        if (countyFeature && countyFeature.geometry) {
          // Calculate bounds from the county geometry
          const coordinates = [];
          
          if (countyFeature.geometry.type === 'Polygon') {
            coordinates.push(...countyFeature.geometry.coordinates[0]);
          } else if (countyFeature.geometry.type === 'MultiPolygon') {
            countyFeature.geometry.coordinates.forEach(polygon => {
              coordinates.push(...polygon[0]);
            });
          }
          
          if (coordinates.length > 0) {
            // Calculate bounding box
            const lngs = coordinates.map(coord => coord[0]);
            const lats = coordinates.map(coord => coord[1]);
            
            const bounds = [
              [Math.min(...lngs), Math.min(...lats)], // SW corner
              [Math.max(...lngs), Math.max(...lats)]  // NE corner
            ];
            
            // Fit the map to the county bounds
            map.fitBounds(bounds, {
              padding: 50,
              duration: 2000
            });
          }
        }
      }
    }
  };

  const showSpeedFilter = () => {
    const map = mapInstanceRef.current;
    if (map && map.getLayer('speed-filter')) {
      map.setLayoutProperty('speed-filter', 'visibility', 'visible');
      // Hide other layers temporarily to show underserved areas clearly
      setShowBroadband(false);
      setShowTracts(false);
    }
  };

  const hideSpeedFilter = () => {
    const map = mapInstanceRef.current;
    if (map && map.getLayer('speed-filter')) {
      map.setLayoutProperty('speed-filter', 'visibility', 'none');
    }
  };

  return (
    <div className="map-container">
      <div ref={mapRef} className="map-element" />
      
      {/* Enhanced Controls Panel */}
      <div className={`layer-controls ${sidebarMinimized ? 'minimized' : ''}`}>
        {!sidebarMinimized && (
          <>
            <div className="controls-header">
              <h3>🗺️ WV Broadband Map</h3>
              <button 
                className="minimize-btn"
                onClick={() => setSidebarMinimized(true)}
                title="Minimize sidebar"
              >
                ←
              </button>
            </div>

            {/* Search Section */}
            <div className="search-section">
              <h4>🔍 Search & Navigate</h4>
              <div className="control-group">
                <label>County:</label>
                <select value={selectedCounty} onChange={handleCountySearch} className="county-select">
                  <option value="">Select a county...</option>
                  {counties.map(county => (
                    <option key={county.fips} value={county.name}>
                      {county.name} County
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Section */}
            <div className="filter-section">
              <h4>🎛️ Filters</h4>
              <div className="control-group">
                <label>Speed Threshold: {speedThreshold} Mbps</label>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={speedThreshold}
                  onChange={(e) => setSpeedThreshold(parseInt(e.target.value))}
                  className="speed-slider"
                />
                <div className="filter-buttons">
                  <button onClick={showSpeedFilter} className="filter-btn show">
                    Show Underserved Areas
                  </button>
                  <button onClick={hideSpeedFilter} className="filter-btn hide">
                    Hide Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Layer Controls */}
            <div className="layer-section">
              <h4>📋 Map Layers</h4>
              <div className="control-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={showCounties} 
                    onChange={handleCountiesToggle}
                  />
                  Counties ({showCounties ? 'visible' : 'hidden'})
                </label>
              </div>
              <div className="control-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={showTracts} 
                    onChange={handleTractsToggle}
                  />
                  Census Tracts ({showTracts ? 'visible' : 'hidden'})
                </label>
              </div>
              <div className="control-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={showBroadband} 
                    onChange={handleBroadbandToggle}
                  />
                  🚀 Broadband Data ({showBroadband ? 'visible' : 'hidden'})
                </label>
              </div>
              <div className="control-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={showOokla} 
                    onChange={() => setShowOokla(!showOokla)}
                  />
                  📊 Ookla Speed Tests ({showOokla ? 'visible' : 'hidden'})
                </label>
              </div>
              <div className="control-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={showComparison} 
                    onChange={() => setShowComparison(!showComparison)}
                  />
                  🔍 Comparison Layer ({showComparison ? 'visible' : 'hidden'})
                </label>
              </div>
            </div>

            {/* Population-Weighted Statistics Panel */}
            {populationStats && (
              <div className="stats-section">
                <h4>📊 Population-Weighted Statistics</h4>
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-number">{populationStats.underserved_percent}%</span>
                    <span className="stat-label">Underserved Population</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{populationStats.underserved_population.toLocaleString()}</span>
                    <span className="stat-label">People Underserved</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{populationStats.pop_weighted_median_speed}</span>
                    <span className="stat-label">Pop-Weighted Speed (Mbps)</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{populationStats.high_speed_percent}%</span>
                    <span className="stat-label">High-Speed Population</span>
                  </div>
                </div>
                <div className="population-breakdown">
                  <p><strong>🏔️ Rural:</strong> {populationStats.geographic_breakdown.rural_percent}% of analyzed population</p>
                  <p><strong>📊 Total Analyzed:</strong> {populationStats.total_population.toLocaleString()} people</p>
                  <p><strong>🎯 Federal Standard:</strong> 25+ Mbps threshold</p>
                </div>
              </div>
            )}

            {/* Legacy Statistics Panel (fallback) */}
            {!populationStats && stats && (
              <div className="stats-section">
                <h4>📊 Coverage Statistics</h4>
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-number">{stats.underservedPercent}%</span>
                    <span className="stat-label">Pop. below {speedThreshold} Mbps</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{stats.avgSpeed}</span>
                    <span className="stat-label">Avg Speed (Mbps)</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{stats.noService}</span>
                    <span className="stat-label">Tracts w/ No Service</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{Math.round((stats.highSpeed / stats.totalTracts) * 100)}%</span>
                    <span className="stat-label">Tracts w/ 100+ Mbps</span>
                  </div>
                </div>
              </div>
            )}

            {/* Export Section */}
            {broadbandData && (
              <div className="export-section">
                <h4>📁 Export & Reports</h4>
                <div className="export-buttons">
                  <button 
                    onClick={generatePDFReport} 
                    disabled={isExporting}
                    className="export-btn pdf"
                  >
                    {isExporting ? '📄 Generating...' : '📄 PDF Report'}
                  </button>
                  <button 
                    onClick={exportToCSV} 
                    className="export-btn csv"
                  >
                    📊 Export CSV
                  </button>
                  <button 
                    onClick={downloadScreenshot} 
                    className="export-btn screenshot"
                  >
                    📷 Screenshot
                  </button>
                </div>
                <p className="export-info">
                  💡 PDF includes statistics, map view, and executive summary
                </p>
              </div>
            )}

            {/* Broadband Legend */}
            {showBroadband && (
              <div className="broadband-legend">
                <h4>📶 Speed Tiers</h4>
                <div className="legend-item">
                  <span className="legend-color no-service"></span>
                  <span>No Service (0 Mbps)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color basic"></span>
                  <span>Basic (&lt;25 Mbps)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color standard"></span>
                  <span>Standard (25-100 Mbps)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color high-speed"></span>
                  <span>High Speed (100-250 Mbps)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color gigabit"></span>
                  <span>Gigabit (1000+ Mbps)</span>
                </div>
              </div>
            )}

            <div className="info">
              <p><strong>Counties:</strong> 55 total</p>
              <p><strong>Tracts:</strong> 546 total</p>
              {broadbandData && (
                <p><strong>Broadband:</strong> {broadbandData.length} records</p>
              )}
              {ooklaData && populationStats && (
                <div>
                  <p><strong>Speed Tiles:</strong> {ooklaData.features.length} tiles</p>
                  <p><strong>Population:</strong> {populationStats.total_population.toLocaleString()} analyzed</p>
                  <p><strong>Underserved:</strong> {populationStats.underserved_population.toLocaleString()} people</p>
                </div>
              )}
              {ooklaData && ooklaSummary && !populationStats && (
                <div>
                  <p><strong>Ookla Tests:</strong> {ooklaSummary.total_tests.toLocaleString()} real tests</p>
                  <p><strong>Speed Tiles:</strong> {ooklaData.features.length} tiles</p>
                  <p><strong>Real Median:</strong> {ooklaSummary.median_download_mbps} Mbps ↓</p>
                </div>
              )}
              <p>💡 Population-weighted analysis shows real impact</p>
              <p>📊 189k+ West Virginians lack adequate broadband</p>
              <p>🎯 Critical data for BEAD funding allocation</p>
            </div>
          </>
        )}
        
        {sidebarMinimized && (
          <button 
            className="expand-btn"
            onClick={() => setSidebarMinimized(false)}
            title="Expand sidebar"
          >
            →
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
