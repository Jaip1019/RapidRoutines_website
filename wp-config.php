<?php
define( 'WP_CACHE', true );
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the web site, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * Localized language
 * * ABSPATH
 *
 * @link https://wordpress.org/support/article/editing-wp-config-php/
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'u956043483_ACYdU' );

/** Database username */
define( 'DB_USER', 'u956043483_yfiVT' );

/** Database password */
define( 'DB_PASSWORD', 'h6gQDucvLz' );

/** Database hostname */
define( 'DB_HOST', '127.0.0.1' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',          '0uq&/VAR].79LK;j/@P3cwQNQb/vHBUEs^S?*t#bSY1JNb&#bzK(8u#nu3%U7BD|' );
define( 'SECURE_AUTH_KEY',   'T_)Ol8;MduOQn|Pw;y.wNeVtlRti+XjXWZL]U(DWv}n6PR}bQ7%dni`F.= }?>1w' );
define( 'LOGGED_IN_KEY',     'akeIe90P94J,-Fj=)IUoYo]5q@9V<rrx1V;tg&ZuKYh:s,{a2F.: d:o5Wu[4*_D' );
define( 'NONCE_KEY',         ';C?01qN[8B. 7%>eY`&.yJho.rKE+TYWp|GBQ=&ZupIjOp4&#L4AXFMU5y!1Uo,3' );
define( 'AUTH_SALT',         '37E2dn7Jv2{9)uT:mb%@2G*nLvlgOeiJx{B?</RS;3`81,81=E[{MX`/%`Wtq{7b' );
define( 'SECURE_AUTH_SALT',  'gat--lh^@,`,MIWwfF`&>|`wXYL$4*%}_S0DPEoA>iVWxn2<b)5 zU;MQL%^p>#&' );
define( 'LOGGED_IN_SALT',    'GhB{eUwLEP*x|2gt}i!:tG>WJf7Kw%d,!X+`2i6ta5{%y?9~!v$uitn$foY `~t8' );
define( 'NONCE_SALT',        'dq3FEwENuWeab!js$FCKT{^@<de_[ESc2{)KZWTO3v{LMo?^*`ZPH$aqQu>3}VJ>' );
define( 'WP_CACHE_KEY_SALT', 'DbE3}.RA#i<xOw|Awb<BBq5,KnY%^_4OTc%iGw q+y=r/[vWWnFoaYO/pAGhFy_/' );


/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';


/* Add any custom values between this line and the "stop editing" line. */



/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/support/article/debugging-in-wordpress/
 */
if ( ! defined( 'WP_DEBUG' ) ) {
	define( 'WP_DEBUG', false );
}

define( 'FS_METHOD', 'direct' );
define( 'COOKIEHASH', 'd798c836d2aeea38c9b7cc6f6dafec2d' );
define( 'WP_AUTO_UPDATE_CORE', 'minor' );
define( 'WP_DEBUG_LOG', false );
define( 'WP_DEBUG_DISPLAY', false );
/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
