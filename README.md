# Localization

[API documentation](https://recoyx.github.io/jslibs/MsgLocalization)

Message localization for JavaScript.

Features:
- Supports loading text resources from HTTP (Web Browser and Node.js) and File System (Node.js).
- Basic language data

## Examples

```javascript
import { MsgLocalization, Gender, PluralRuleSelector, parseLocale } from 'com.recoyxgroup.msglocalization';

const localization = new MsgLocalization({
    supportsLocales: ['en-US', 'en-GB', 'ja', 'pt-BR'],
    defaultLocale: 'en-US',
    fallbacks: {
        'pt-BR': 'en-US',
        'en-GB': ['ja', 'pt-BR']
    },
    assets: {
        src: 'path/to/res/lang',
        files: ['common'],
        cleanUnusedAssets: true,
        // 'fileSystem', 'http'
        loadAssetsVia: 'fileSystem',
    },
});

(async () => {
    // Promise<boolean>
    await localization.load();

    const t = localization.t.bind(localization);
    console.log(t('common.messageId'));
    console.log(t('common.parameterized', { x: 'foo' }));
    console.log(t('common.contextual', Gender.FEMALE));
    console.log(t('common.qty', new PluralRuleSelector(new Intl.PluralRules(localization.currentLocaleSequenceStr), 10)));
})();
```

Example assets:

```json
{
    "messageId": "Some message",
    "parameterized": "Here: $x",
    "contextualMale": "Male message",
    "contextualFemale": "Female message",
    "qtyZero": "$number: zero",
    "qtyOne": "$number: one",
    "qtyOther": "$number: other"
}
```