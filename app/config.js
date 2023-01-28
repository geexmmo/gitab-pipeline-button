module.exports = {
  secret: 'here here', //cookie secret
  logo: 'https://www.logos.example/logo.svg', //goes on every page
  gitlab: {
    uri: 'http://gitlab.example/api/v4/projects/', //gitlab url example
    personalToken: 'glpat-YD9H5zpbxntxwqjQtyuE', //gitlab personal token example
    projectID: '166', //gitlab project example
    ref: 'app-update' //branch name
  },
  users: ['arthur', 'otheruser'], //user allowed to login
  ldap: {
    adminDN: 'CN=superadmin,CN=superadminFolder,DC=domain,DC=example', //ldap admin user dn
    adminPW: 'ThEpassWord123', //ldap admin pw
    userParam: 'sAMAccountName', //user login name attribute
    dn: 'OU=UsersFolder,DC=domain,DC=example', //ldap user search path
    url: 'ldap://domain.example', //ldap url
    connectTimeout: '500' //ldap timeout
  }
}