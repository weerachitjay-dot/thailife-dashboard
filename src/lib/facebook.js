
import { FACEBOOK_APP_ID } from '../utils/constants';

export const initFacebookSdk = () => {
    return new Promise((resolve, reject) => {
        if (window.FB) {
            resolve();
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: FACEBOOK_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
            resolve();
        };

        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    });
};

export const loginWithFacebook = () => {
    return new Promise((resolve, reject) => {
        if (!window.FB) {
            reject('Facebook SDK not loaded');
            return;
        }

        window.FB.login((response) => {
            if (response.authResponse) {
                resolve(response.authResponse);
            } else {
                reject('User cancelled login or did not fully authorize.');
            }
        }, { scope: 'public_profile,email,ads_read' }); // ads_read enabled in FB App
    });
};

export const getLoginStatus = () => {
    return new Promise((resolve, reject) => {
        if (!window.FB) {
            reject('Facebook SDK not loaded');
            return;
        }
        window.FB.getLoginStatus((response) => {
            resolve(response);
        });
    });
};
