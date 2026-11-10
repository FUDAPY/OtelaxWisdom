const neo4j = require('neo4j-driver');
const config = require('./env');

const driver = neo4j.driver(
  config.neo4j.uri,
  neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
  {
    maxConnectionLifetime: 3 * 60 * 60 * 1000,
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 20000
  }
);

module.exports = {
  driver,
  getSession: (mode = neo4j.session.WRITE) => driver.session({ defaultAccessMode: mode }),
  close: () => driver.close()
};
