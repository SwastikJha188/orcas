-- Plain wording for the pyro line's starting service records (040). The note is
-- shown as the part's "Record" in Maintenance; it says where the numbers come
-- from without simulation wording, which stays inside the Simulation tab.
UPDATE component_service_lives
   SET record_source = 'Estimated: the plant has not sent its service records yet'
 WHERE record_source = 'Simulation record: the plant has not supplied its service records yet';
