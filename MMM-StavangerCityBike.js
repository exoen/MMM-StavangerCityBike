// eslint-disable-next-line no-undef
Module.register('MMM-StavangerCityBike', {
  defaults: {
    availabilityReloadInterval: 300000, // 5 minutes
    stationInfoReloadInterval: 86400000, // 1 day
    stationsToInclude: [],
    stationsToExclude: [],
  },

  getStyles() {
    return ['module.css', 'font-awesome.css'];
  },

  getScripts() {
    return ['haversine-distance.js'];
  },

  async start() {
    this.stations = [];
    this.stationNames = {};
    this.stationCoordinates = {};

    await this.getStationInfo();
    await this.getAvailability();

    const self = this;
    setInterval(() => {
      self.getAvailability();
    }, self.config.availabilityReloadInterval);

    setInterval(() => {
      self.getStationInfo();
    }, self.config.stationInfoReloadInterval);
  },

  getDom() {
    if (!this.stations || !this.stations.length > 0) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = 'No bike stations found';
      return wrapper;
    }

    this.stations.sort((a, b) => this.stationNames[a.DockingStationId]
      .localeCompare(this.stationNames[b.DockingStationId]));

    const table = document.createElement('table');
    table.className = 'small';
    table.appendChild(this.renderHeader());

    this.stations.forEach((station) => table.appendChild(this.renderRow(station)));
    return table;
  },

  renderHeader() {
    const station = document.createElement('th');
    station.innerHTML = 'Station';
    station.className = 'light';

    const available = document.createElement('th');
    available.innerHTML = 'Available bikes';
    available.className = 'light';

    const header = document.createElement('tr');
    header.appendChild(station);
    header.appendChild(available);
    return header;
  },

  renderRow(station) {
    const stationName = document.createElement('td');
    stationName.innerHTML = this.stationNames[station.DockingStationId];
    stationName.className = 'station bright';

    const bikesAvailable = document.createElement('td');
    bikesAvailable.innerHTML = station.FreeBikes;
    bikesAvailable.className = 'bike bright';

    const bike = document.createElement('i');
    bike.className = 'fas fa-bicycle cycle-icon';
    bikesAvailable.appendChild(bike);

    const row = document.createElement('tr');
    row.appendChild(stationName);
    row.appendChild(bikesAvailable);
    return row;
  },

  filterStations(stations) {
    const stationsWithinArea = this.stationsWithinArea(stations);
    stationsWithinArea
      .forEach((station) => this.config.stationsToInclude.push(station.DockingStationId));

    return stations
      .filter((station) => this.config.stationsToInclude.includes(station.DockingStationId)
        && !this.config.stationsToExclude.includes(station.DockingStationId));
  },

  stationsWithinArea(stations) {
    if (!this.config.area
      || !this.config.area.lat
      || !this.config.area.lng
      || !this.config.area.radiusInMeters) {
      return [];
    }
    const stationsWithinArea = [];
    stations.forEach((station) => {
      const stationCoordinates = this.stationCoordinates[station.DockingStationId];
      if (!stationCoordinates) return;

      const spesifiedCoordinates = this.getSpecifiedLatLng();
      // eslint-disable-next-line no-undef
      const distance = haversineDistance(stationCoordinates, spesifiedCoordinates);
      if (distance <= this.config.area.radiusInMeters) {
        stationsWithinArea.push(station);
      }
    });
    return stationsWithinArea;
  },

  getLatLng(station) {
    return { lat: station.Latitude, lng: station.Longitude };
  },

  getSpecifiedLatLng() {
    return {
      lat: this.config.area.lat,
      lng: this.config.area.lng,
    };
  },

  async getAvailability() {
    const response = await fetch('https://opencom.no/dataset/00b94410-ea79-49de-a10f-1a0c10c8b842/resource/6539f285-9de4-45bf-8369-c1f3960f12c7/download/bysykkel.json');
    const CityBikeJson = await response.json();
    this.stations = this.filterStations(CityBikeJson.DockingStations);
    this.updateDom();
  },

  async getStationInfo() {
    const response = await fetch('https://opencom.no/dataset/7a4987dd-25ce-4b5c-be94-8a55808c2b43/resource/6365033e-eca7-4cd0-b24e-94f984f7137f/download/sykkel.json');
    const stationJson = await response.json();
    stationJson.DockingStations.forEach((station) => {
      this.stationNames[station.DockingStationId] = station.DockingStationName;
      this.stationCoordinates[station.DockingStationId] = this.getLatLng(station);
    });
    this.updateDom();
  },
});
