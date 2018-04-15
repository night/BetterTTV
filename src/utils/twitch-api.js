const $ = require('jquery');
const querystring = require('querystring');

const API_ENDPOINT = 'https://api.twitch.tv/v5/';
const CLIENT_ID = '6x8avioex0zt85ht6py4sq55z6avsea';

let accessToken;

function request(method, path, options = {}) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${API_ENDPOINT}${path}${options.qs ? `?${querystring.stringify(options.qs)}` : ''}`,
            method,
            dataType: 'json',
            data: options.body ? JSON.stringify(options.body) : undefined,
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': (options.auth && accessToken) ? `OAuth ${accessToken}` : undefined
            },
            timeout: 30000,
            success: data => resolve(data),
            error: ({status, responseJSON}) => reject({
                status,
                data: responseJSON
            })
        });
    });
}

module.exports = {
    setAccessToken(newAccessToken) {
        accessToken = newAccessToken;
    },

    get(path, options) {
        return request('GET', path, options);
    },

    post(path, options) {
        return request('POST', path, options);
    },

    put(path, options) {
        return request('PUT', path, options);
    },

    patch(path, options) {
        return request('PATCH', path, options);
    },

    delete(path, options) {
        return request('DELETE', path, options);
    }
};
