const HOUR = 60 * 60 * 1000;

/* ======== BEGIN BOILERPLATE ======== */
function onInstall(e) {
  onOpen(e);
}

function onOpen(e) {
  FormApp.getUi().createAddonMenu()
      .addItem('Schedule Open/Close', 'onSchedule_')
      .addToUi();
}
/* ======== END BOILERPLATE ======== */



/* ======== BEGIN MENU ITEMS ======== */
function onSchedule_() {
  FormApp.getUi().showModalDialog(
      HtmlService.createHtmlOutputFromFile("Main").setWidth(600).setHeight(675), "Schedule");
}
/* ======== END MENU ITEMS ======== */



/* ======== BEGIN SCHEDULE SETTINGS ======== */
function getScheduleSettings() {
  var props = PropertiesService.getDocumentProperties();
  
  var user = props.getProperty("user");
  var openTime = props.getProperty("openTime");
  var closeTime = props.getProperty("closeTime");
  var emailNotif = props.getProperty("emailNotif");
  
  return {"user":user, "openTime":openTime, "closeTime":closeTime, "emailNotif":emailNotif, "currUser":Session.getActiveUser().getEmail()};
}


function setScheduleSettings_(user, openTime, closeTime, emailNotif) {
  var props = PropertiesService.getDocumentProperties();
  if (openTime) props.setProperty("openTime", openTime);
  if (closeTime) props.setProperty("closeTime", closeTime);
  if (emailNotif) props.setProperty("emailNotif", emailNotif);
  
  if (openTime || closeTime) {
    props.setProperty("user", user);
  } else {
    props.deleteProperty("user");
  }
}
/* ======== END SCHEDULE SETTINGS ======== */



/* ======== BEGIN SUBMIT ======== */
function submitSchedule(openString, closeString, emailNotif) {
  var props = PropertiesService.getDocumentProperties();
  var currUser = Session.getActiveUser().getEmail();
  var prevUser = props.getProperty("user");
  if (prevUser && prevUser != currUser) throw "Sorry, but " + prevUser + " has already scheduled an open and/or close action for this form!";
  
  var lastString = props.getProperty("lastTime");
  var openTime;
  var closeTime;
  var lastTime;
  if (openString && openString != "") openTime = new Date(openString);
  if (closeString && closeString != "") closeTime = new Date(closeString);
  if (lastString && lastString != "") lastTime = new Date(lastString);
  
  if (!checkTriMinDiff_(HOUR, openTime, closeTime, lastTime)) {
    throw "Due to limitations by Google, open and close actions cannot occur within one hour of each other.";
  }
  
  var currDate = new Date();
  if ((openTime && openTime < currDate) || (closeTime && closeTime < currDate)) {
    throw "Open and close actions cannot be scheduled in the past.";
  }
  
  clearTriggers_();
  if (openTime) setOpenTrigger_(openTime - currDate);
  if (closeTime) setCloseTrigger_(closeTime - currDate);
  
  setScheduleSettings_(currUser, openTime, closeTime, emailNotif);
}
/* ======== END SUBMIT ======== */



/* ======== BEGIN DATE UTILS ======== */
function checkTriMinDiff_(min, first, second, third) {
  return checkMinDiff_(min, first, second) && checkMinDiff_(min, second, third) && checkMinDiff_(min, first, third);
}

function checkMinDiff_(min, first, second) {
  if (first && second) {
    return Math.abs(first - second) >= min;
  }
  
  return true;
}
/* ======== END DATE UTILS ======== */



/* ======== BEGIN FORM UTILS ======== */
function openForm() {  
  var props = PropertiesService.getDocumentProperties();
  props.setProperty("lastTime", props.getProperty("openTime"));
  props.deleteProperty("openTime");

  sendNotification_("Your form is now accepting responses!");
  
  if(!props.getProperty("closeTime")) props.deleteProperty("user")
  
  FormApp.getActiveForm().setAcceptingResponses(true);
}

function closeForm() {
  var props = PropertiesService.getDocumentProperties();
  props.setProperty("lastTime", props.getProperty("closeTime"));
  props.deleteProperty("closeTime");

  sendNotification_("Your form is no longer accepting responses!");
  
  if(!props.getProperty("openTime")) props.deleteProperty("user")
  
  FormApp.getActiveForm().setAcceptingResponses(false);
}
/* ======== END FORM UTILS ======== */



/* ======== BEGIN TRIGGER UTILS ======== */
function setOpenTrigger_(offset) {
  ScriptApp.newTrigger("openForm").timeBased().after(offset).create();
}

function setCloseTrigger_(offset) {
  ScriptApp.newTrigger("closeForm").timeBased().after(offset).create();
}

function clearTriggers_() {
  var triggers = ScriptApp.getUserTriggers(FormApp.getActiveForm());

  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getEventType() === ScriptApp.EventType.CLOCK) {
      ScriptApp.deleteTrigger(triggers[i]);
      console.log("Deleted trigger");
    }
  }
}
/* ======== END TRIGGER UTILS ======== */



/* ======== BEGIN EMAIL UTILS ======== */
function sendNotification_(message) {
  var props = PropertiesService.getDocumentProperties();
  var emailNotif = props.getProperty("emailNotif");
  if (emailNotif) {
    MailApp.sendEmail(props.getProperty("user"), "Scheduled Google Form Action Alert", message);
  }
}
/* ======== END EMAIL UTILS ======== */