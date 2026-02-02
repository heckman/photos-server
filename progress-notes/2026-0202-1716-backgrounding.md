This is how i was trying to get the modals not to interfere with opening URLs.

Combined with the plist item: `"LSUIElement": true` it should also keep the
app hidden when opening a URL when the control panel is not open.

I didn't get this working with the multi-library version of the code,
but i think it was library issues causing the trouble.

When I give up on using libraries, I'll try this again.

```javascript
function controlPanel() {
	const app = $.NSApplication.sharedApplication;

	// 1. Force the app to stay alive and show its face
	app.setActivationPolicy($.NSApplicationActivationPolicyRegular);

	// 2. Schedule the dialog.
	// We call it on 'app' but tell it to find the function in 'this' (the library)
	app.performSelectorWithObjectAfterDelay("primeModal", null, 0.5);

	// 3. Register the URL handler so it's live before the loop starts
	$.NSAppleEventManager.sharedAppleEventManager.setEventHandlerAndSelectorForEventClassAndEventID(
		this,
		"handleLinkEvent",
		"GURL",
		"GURL",
	);

	// 4. Start the engine
	app.run;
}

function primeModal() {
	$.NSApp.activateIgnoringOtherApps(true);
	// ...
}

function handleLinkEvent(event) {
	const urlString = ObjC.unwrap(
		event.paramDescriptorForKeyword("----").stringValue,
	);
	Handler.openUrl(urlString);
}
```

I tried adding this to the working code from the main branch,
but the dialog box does not appear.
