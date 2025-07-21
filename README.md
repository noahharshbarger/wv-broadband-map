# West Virginia Broadband Analysis Tool

An interactive web application for analyzing broadband coverage gaps in West Virginia using population-weighted statistics and real speed test data.

**🔗 Live Demo:** https://noahharshbarger.github.io/wv-broadband-map/  
**📋 Policy Brief:** [POLICY_BRIEF.md](POLICY_BRIEF.md)

![West Virginia Broadband Map Screenshot](https://via.placeholder.com/800x400/2c3e50/ffffff?text=WV+Broadband+Map+Screenshot)

## Overview

This tool combines FCC broadband coverage data with real-world speed test measurements to provide policy-makers and researchers with actionable insights into West Virginia's digital divide. The analysis reveals that while 71.6% of West Virginians have access to high-speed internet, **189,079 people still lack adequate broadband access**.

### Key Features

- **Population-weighted analysis** that prioritizes areas with higher population density
- **Interactive mapping** with census tract-level granularity (546 tracts)
- **Real speed test data** from 15,838 Ookla measurements
- **Policy-ready exports** including PDF reports, CSV data, and map screenshots
- **Multiple data layers** for comprehensive coverage analysis

### Key Findings

- **10.6% of West Virginians** lack broadband meeting federal standards (25+ Mbps)
- **256.6 Mbps population-weighted average speed** indicates strong infrastructure quality
- **92.1% rural population** highlights geographic service challenges
- Targeted investment could achieve near-universal coverage more cost-effectively than comprehensive rebuilding

## Technology Stack

- **Frontend:** React 18, Mapbox GL JS
- **Data Processing:** Python (pandas, geopandas)
- **Deployment:** GitHub Pages with Vite
- **Data Sources:** FCC Broadband Data Collection (June 2024), Ookla Open Data, US Census

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Mapbox account and access token

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/noahharshbarger/wv-broadband-map.git
   cd wv-broadband-map
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your Mapbox access token
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

### Deployment

The app is configured for GitHub Pages deployment:

```bash
npm run deploy
```

## Data Sources & Processing

### Primary Data Sources
- **FCC Broadband Data Collection** (June 2024) - Official coverage data
- **Ookla Open Data** - Real-world speed test measurements  
- **US Census Bureau** - Population data for weighting analysis
- **TIGER/Line Shapefiles** - Geographic boundaries for counties and census tracts

### Data Processing Pipeline
1. Download and filter FCC data for West Virginia
2. Process Ookla speed test data and aggregate by census tract
3. Apply population weighting to prioritize high-impact areas
4. Generate color-coded visualizations based on service tiers
5. Export processed data as GeoJSON for web mapping

## Usage

### For Policy Makers
- Use the **PDF export** feature to generate reports for legislative presentations
- **Filter by speed thresholds** to explore different policy scenarios
- **Focus on specific counties** to understand local needs
- **Export underlying data** as CSV for detailed analysis

### For Researchers
- All processing code available for replication in other states
- Population weighting methodology can be adapted for different metrics
- Open data sources enable verification and extension of analysis

### For Community Advocates
- **Visual storytelling** to communicate broadband gaps to stakeholders
- **County-specific statistics** for local advocacy efforts
- **Screenshot tools** for presentations and social media

## Methodology Notes

### Strengths
- Population weighting ensures analysis reflects actual impact on people
- Multiple data sources provide comprehensive verification
- Census tract granularity enables precise targeting

### Limitations
- Ookla data has bias toward users with existing internet connections
- Speed test data may not capture most disconnected communities
- Analysis represents conservative estimate of true underserved population

See [POLICY_BRIEF.md](POLICY_BRIEF.md) for detailed methodology and policy implications.

## Contributing

This project is open source to enable replication and improvement. Contributions welcome for:

- **Additional data layers** (schools, hospitals, economic zones)
- **Multi-state analysis** capabilities
- **Improved population weighting** methodologies
- **Enhanced export features**

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contact

Questions about methodology, data sources, or technical implementation? Open an issue or reach out via GitHub.

---

*This analysis provides an evidence-based foundation for broadband policy decisions and should be supplemented with local community input and on-ground verification of service quality.* 