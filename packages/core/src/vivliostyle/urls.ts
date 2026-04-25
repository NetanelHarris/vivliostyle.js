/**
 * Copyright 2015 Daishinsha Inc.
 * Copyright 2019 Vivliostyle Foundation
 *
 * Vivliostyle.js is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle.js is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Vivliostyle.js.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @fileoverview Urls - URL Utilities
 */

/**
 * transform all urls in attributeValue using documentURLTransformer.
 *
 * @returns transformed attributeValue
 */

const escapeURLForCSS = (url) =>
  String(url).replace(/[\u0000-\u001F\u007F"'()\\\s]/g, (m) =>
    `%${m.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );

export const transformURIs = (
  attributeValue,
  baseUrl,
  documentURLTransformer,
) =>
  attributeValue
    .replace(
      /[uU][rR][lL]\(\s*"((\\([^0-9a-fA-F]+|[0-9a-fA-F]+\s*)|[^"\r\n])+)"/gm,
      (match, m1) =>
        `url("${escapeURLForCSS(documentURLTransformer.transformURL(m1, baseUrl))}"`,
    )
    .replace(
      /[uU][rR][lL]\(\s*'((\\([^0-9a-fA-F]+|[0-9a-fA-F]+\s*)|[^'\r\n])+)'/gm,
      (match, m1) =>
        `url('${escapeURLForCSS(documentURLTransformer.transformURL(m1, baseUrl))}'`,
    )
    .replace(
      /[uU][rR][lL]\(\s*((\\([^0-9a-fA-F]+|[0-9a-fA-F]+\s*)|[^"'\r\n\)\s])+)/gm,
      (match, m1) =>
        `url(${escapeURLForCSS(documentURLTransformer.transformURL(m1, baseUrl))}`,
    );
