
module.exports = async function () {
	const writeToLog = require("./writeToLog");
	const {spawn} = require("child_process");
	const child = spawn("java", ["-jar", "selenium-server/selenium-server-standalone-3.13.0.jar"]);

	child.stdout.on("data", (data) => {
		writeToLog(`SELENIUM OUT: ${data}`);
	});

	child.stderr.on("data", (data) => {
		writeToLog(`SELENIUM ERROR: ${data}`);
	});

	const {DriverService} = require("selenium-webdriver/remote");
	let hibernating = true;

	// load dependencies
	// require("geckodriver");
	require("dotenv").config();
	require("chromedriver");
	const {Builder, By, Key, until, WebElement} = require("selenium-webdriver");
	const Chrome = require("selenium-webdriver/chrome");
	// const firefox = require("selenium-webdriver/firefox");

	// Set default screen resolution (for headless instance)
	// If running on a headless Linux server, make sure you have xvfb configured
	const screenResolution = {
		width: 1280,
		height: 720,
	};

	// Set config variables
	let webdriver = process.env.WEBDRIVER || "chrome";
	const args = ["--disable-web-security", "--disable-gpu", "--enable-javascript", "--disable-dev-shm-usage"]; // Headless, not visible window, disable-dev-shm-usage is supposed to help if running as root
	// const args = ["--disable-web-security"]; // visible window
	const options = new Chrome.Options().setChromeBinaryPath(process.env.CHROME_BIN).addArguments(args).windowSize(screenResolution);

	let driver = await new Builder().forBrowser(webdriver).setChromeOptions(options).build();
	// .setChromeOptions(new chrome.Options().headless().setChromeBinaryPath(process.env.CHROME_BIN).addArguments(args).windowSize(screenResolution))
	//WITHOUT LOGGING .setChromeOptions(new chrome.Options().setChromeBinaryPath(process.env.CHROME_BIN).headless().addArguments(args).windowSize(screenResolution).excludeSwitches("enable-logging"))
	// .setFirefoxOptions(new firefox.Options().setBinary(`${process.env.FIREFOX_BIN}`).headless().addArguments(args).windowSize(screenResolution))

	// Refreshing of instance starts here.
	try {
		// Clear cookies to ensure we get the cookie pop-up every time.
		await driver.manage().deleteAllCookies();

		// Clear local storage and session storage
		// await driver.executeScript("window.localStorage.clear();");
		// await driver.executeScript("window.sessionStorage.clear();");

		// Go to servicenow Developers page
		writeToLog("wakeUpInstance: Redirecting to https://developer.servicenow.com/dev.do");
		await driver.get("https://developer.servicenow.com/dev.do");
		await driver.wait(until.titleContains("ServiceNow Developers"), 300000);

    // Switch first to the iFrame containing the cookie buttons
		driver.switchTo().frame(driver.findElement(By.js('return document.querySelector(".truste_box_overlay_inner > .truste_popframe")')));
		const requiredCookiesButton = driver.wait(
			until.elementLocated(By.js('return document.querySelector(".pdynamicbutton > .required")')),
			30000
		);

    // Click the button to accept only required cookies
    writeToLog("wakeUpInstance: Finding the \"Required Only\" cookies button");
		await driver.wait(until.elementIsVisible(requiredCookiesButton), 30000).click();

    const closeCookieWindowButton = driver.wait(
			until.elementLocated(By.js('return document.querySelector(".pdynamicbutton > .close")')),
			30000
    );

    // Click the button to accept only required cookies
    writeToLog("wakeUpInstance: Finding the \"Close\" cookies button");
    await driver.wait(until.elementIsVisible(closeCookieWindowButton), 30000).click();

    // Switch back to the main content from the iFrame
    await driver.switchTo().defaultContent();

		let signInButton = driver.wait(
			// This spaghetti element selector is due to SN Developer page is filled with Shadow Root elements
			until.elementLocated(
				By.js(
					'return document.querySelector("body > dps-app").shadowRoot.querySelector("div > header > dps-navigation-header").shadowRoot.querySelector("header > div > div.dps-navigation-header-utility > ul > li:nth-child(2) > dps-login").shadowRoot.querySelector("div > dps-button").shadowRoot.querySelector("button")'
				)
			),
			30000
		);

		writeToLog("wakeUpInstance: Finding the Sign in button");
		await driver.wait(until.elementIsVisible(signInButton), 30000).click();

		writeToLog("wakeUpInstance: Wait until URL contains \"username\"");
		await driver.wait(until.urlContains('username'), 300000);
		// await driver.wait(until.titleIs("ServiceNow SignOn"), 300000);

		// enter email
		// await driver.findElement(By.id("username")).sendKeys(`${process.env.EMAIL}`);
		writeToLog("wakeUpInstance: Input the email address");
    const emailInput = await driver.wait(until.elementLocated(By.css('input[type="text"][id="email"]')), 30000);
    emailInput.sendKeys(`${process.env.EMAIL}`);

		// click next
		writeToLog("wakeUpInstance: Click \"Next\"");
		await driver.findElement(By.id("username_submit_button")).click();

		// enter password
		writeToLog("wakeUpInstance: Waiting for password field to appear");
		let pwd = driver.wait(until.elementLocated(By.id("password")), 5000);
    
		writeToLog("wakeUpInstance: Fill in the password");
		await driver.wait(until.elementIsVisible(pwd), 5000).sendKeys(`${process.env.PASSWORD}`);

		// click sign in
		writeToLog("wakeUpInstance: Find \"Sign in\" button");
		let signInBtn = driver.wait(until.elementLocated(By.id("password_submit_button")), 5000);
		await driver.wait(until.elementIsVisible(signInBtn), 5000).click();
		writeToLog("wakeUpInstance: Clicked submit button");

		await new Promise((resolve) => setTimeout(resolve, 10000));

		writeToLog("wakeUpInstance: Wait to sign in, then try to find ServiceNow Developers from the title");
		try {
			await driver.wait(until.titleContains("Developers"), 120000); // Title found from <head>
		} catch (err) {
			writeToLog("ERROR > " + err);
		}
		// Here we can assume that the instance will be waking automatically after signing in. Still pause for a bit before trying to get the wakeup button.
		hibernating = false;

		try {
			writeToLog('wakeUpInstance: Check if the "Waking up instance is present"');
			const wakingUp = await driver.findElement(
				By.js(
					'return document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth-quebec").shadowRoot.querySelector("div > section:nth-child(1) > div > dps-page-header > div:nth-child(2) > div > p")'
				)
			);

			const wakingUpTextVisible = await wakingUp.isDisplayed();
			if (wakingUpTextVisible) {
				// Wait until Waking up text disappears, up to 2 mins
				await driver.wait(until.stalenessOf(wakingUp), 120000);
			}
		} catch (err) {
			writeToLog("WARN: wakingUp could not locate \"Waking up the instance text\" >> " + err);
		} finally {
			// The text might not be present, try to find the Start building button
			writeToLog("wakeUpInstance: Try to locate Start building button");
			try {
				let wakeInstanceBtn = driver.wait(
					// This spaghetti element selector is due to SN Developer page is filled with Shadow Root elements
					until.elementLocated(
						By.js(
							'return document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth-quebec").shadowRoot.querySelector("div > section:nth-child(1) > div > dps-page-header > div:nth-child(1) > button")'
						)
					),
					30000
				);
				writeToLog("wakeUpInstance: Waking your instance up!");
				await driver.wait(until.elementIsVisible(wakeInstanceBtn), 30000).click();
				writeToLog("wakeUpInstance: Clicked wake instance button");
			} catch (err) {
				writeToLog("ERROR wakeInstanceBtn >> " + err);
			}
		}
	} catch (err) {
		writeToLog("wakeUpInstance: ERROR >> " + err);
	} finally {
		// Wait 4 minutes before terminating Selenium
		setTimeout(async () => {
			await driver.quit();
		}, 240000);
		writeToLog("wakeUpInstance: TERMINATING wakeUpInstance");
	}
	child.on("close", (code) => {
		writeToLog(`SELENIUM EXITED WITH CODE ${code}`);
	});

	child.kill("SIGTERM");
	return hibernating;
};
