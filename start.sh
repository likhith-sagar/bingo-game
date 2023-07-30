#obfuscate js files
npx javascript-obfuscator scripts --output generated/scripts

#minify css
npx cleancss --batch --batch-suffix '' styles/*.css -o generated/styles

#start server
node app.js